const STORAGE_KEY = "portfolioNarrativeArchitect.v1";

const form = document.querySelector("#narrative-form");
const newCaseStudyBtn = document.querySelector("#new-case-study");
const exportAllBtn = document.querySelector("#export-all");
const clearBtn = document.querySelector("#clear-form");
const listEl = document.querySelector("#case-study-list");
const emptyState = document.querySelector("#empty-state");
const template = document.querySelector("#case-study-template");

let caseStudies = loadCaseStudies();

render();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!form.reportValidity()) {
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  const caseStudy = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...data,
    impactScore: Number(data.impactScore),
  };

  caseStudies.unshift(caseStudy);
  persist();
  form.reset();
  render();
});

newCaseStudyBtn.addEventListener("click", () => {
  form.scrollIntoView({ behavior: "smooth", block: "start" });
  form.querySelector("#title").focus();
});

clearBtn.addEventListener("click", () => {
  form.reset();
});

exportAllBtn.addEventListener("click", () => {
  if (caseStudies.length === 0) {
    alert("Add at least one case study before exporting.");
    return;
  }

  downloadFile(
    "portfolio-narratives.json",
    JSON.stringify(caseStudies, null, 2),
    "application/json"
  );
});

function loadCaseStudies() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(caseStudies));
}

function render() {
  listEl.innerHTML = "";
  emptyState.hidden = caseStudies.length > 0;

  for (const caseStudy of caseStudies) {
    const node = template.content.firstElementChild.cloneNode(true);
    const score = calculateNarrativeScore(caseStudy);

    node.querySelector(".case-title").textContent = caseStudy.title;
    node.querySelector(
      ".case-meta"
    ).textContent = `${caseStudy.role} • ${caseStudy.industry} • ${new Date(
      caseStudy.createdAt
    ).toLocaleDateString()}`;
    node.querySelector(
      ".score-pill"
    ).textContent = `Strategic Narrative Score: ${score}/100`;

    node.querySelector(".case-body").append(buildNarrative(caseStudy));

    node
      .querySelector(".delete-case")
      .addEventListener("click", () => deleteCaseStudy(caseStudy.id));
    node
      .querySelector(".download-markdown")
      .addEventListener("click", () => exportCaseStudyMarkdown(caseStudy));

    listEl.append(node);
  }
}

function calculateNarrativeScore(item) {
  const lengths = [
    item.strategicProblem,
    item.marketContext,
    item.riskMitigation,
    item.systemMap,
    item.tradeoffs,
    item.impactNarrative,
    item.evidence,
  ].map((value) => value.length);

  const depthPoints = lengths.reduce((sum, len) => sum + Math.min(len / 3.5, 12), 0);
  const riskMultiplier =
    {
      Low: 0.9,
      Medium: 1,
      High: 1.08,
      Transformational: 1.15,
    }[item.riskLevel] ?? 1;

  const impactBonus = item.impactScore * 2.3;
  const raw = (depthPoints + impactBonus) * riskMultiplier;
  return Math.max(45, Math.min(100, Math.round(raw)));
}

function buildNarrative(item) {
  const wrapper = document.createElement("div");
  const blocks = [
    ["Strategic problem", item.strategicProblem],
    ["Market context", `${item.audience} in ${item.industry}. ${item.marketContext}`],
    ["Risk", `${item.riskType} (${item.riskLevel}). ${item.riskMitigation}`],
    ["System thinking", `${item.systemMap} Tradeoffs: ${item.tradeoffs}`],
    [
      "Long-term impact",
      `${item.timeline} horizon with projected impact ${item.impactScore}/10. ${item.impactNarrative}`,
    ],
    ["Evidence", item.evidence],
  ];

  for (const [heading, content] of blocks) {
    const h = document.createElement("h4");
    h.textContent = heading;
    const p = document.createElement("p");
    p.textContent = content;
    wrapper.append(h, p);
  }

  return wrapper;
}

function deleteCaseStudy(id) {
  caseStudies = caseStudies.filter((item) => item.id !== id);
  persist();
  render();
}

function exportCaseStudyMarkdown(item) {
  const markdown = `# ${item.title}\n\n` +
    `**Role:** ${item.role}  \n` +
    `**Strategic Narrative Score:** ${calculateNarrativeScore(item)}/100\n\n` +
    `## Strategic Problem\n${item.strategicProblem}\n\n` +
    `## Market Context\n- Industry: ${item.industry}\n- Audience: ${item.audience}\n- Context: ${item.marketContext}\n\n` +
    `## Risk\n- Level: ${item.riskLevel}\n- Type: ${item.riskType}\n- Mitigation: ${item.riskMitigation}\n\n` +
    `## System Thinking\n- Map: ${item.systemMap}\n- Tradeoffs: ${item.tradeoffs}\n\n` +
    `## Long-Term Impact\n- Horizon: ${item.timeline}\n- Score: ${item.impactScore}/10\n- Narrative: ${item.impactNarrative}\n\n` +
    `## Evidence and Outcomes\n${item.evidence}\n`;

  const filename = `${slugify(item.title)}.md`;
  downloadFile(filename, markdown, "text/markdown");
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
