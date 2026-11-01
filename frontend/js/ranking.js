requireAuth();

const jobSelect = document.getElementById("job-select");
const searchInput = document.getElementById("search");
const minScoreInput = document.getElementById("min-score");
const sortSelect = document.getElementById("sort");
const resultsBody = document.getElementById("results-body");
const resultsCount = document.getElementById("results-count");
const pageMessage = document.getElementById("page-message");
const comparePanel = document.getElementById("compare-panel");
const compareGrid = document.getElementById("compare-grid");

let allResults = [];
let selectedIds = []; // ids of candidates ticked for comparison (max 2)

function showPageMessage(text) {
  pageMessage.textContent = text;
  pageMessage.className = text ? "form-message error" : "form-message";
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text; // textContent keeps resume data safe
  return node;
}

function makeChips(skills, extraClass) {
  const wrapper = el("div");
  if (!skills || skills.length === 0) {
    wrapper.appendChild(el("span", "cell-sub", "None"));
    return wrapper;
  }
  skills.forEach((skill) =>
    wrapper.appendChild(el("span", `chip ${extraClass}`, skill)),
  );
  return wrapper;
}

function makeBreakdown(breakdown) {
  const wrapper = el("div");
  if (!breakdown || breakdown.length === 0) {
    wrapper.appendChild(el("span", "cell-sub", "No breakdown available."));
    return wrapper;
  }
  breakdown.forEach((part) => {
    const row = el("div", "score-row");
    const label = el("div", "label");
    label.appendChild(el("span", "", `${part.label} (weight ${part.weight}%)`));
    label.appendChild(el("strong", "", `${part.score}%`));
    const bar = el("div", "bar");
    const fill = el("span");
    fill.style.width = `${Math.max(0, Math.min(100, part.score))}%`;
    bar.appendChild(fill);
    row.appendChild(label);
    row.appendChild(bar);
    wrapper.appendChild(row);
  });
  return wrapper;
}

// ----- Filtering and sorting -----
function getVisibleResults() {
  const query = searchInput.value.trim().toLowerCase();
  const minScore = Number(minScoreInput.value) || 0;

  const filtered = allResults.filter((r) => {
    const text = `${r.candidateName || ""} ${r.email || ""}`.toLowerCase();
    return text.includes(query) && r.score >= minScore;
  });

  const sortBy = sortSelect.value;
  filtered.sort((a, b) => {
    if (sortBy === "score-asc") return a.score - b.score;
    if (sortBy === "name")
      return (a.candidateName || "").localeCompare(b.candidateName || "");
    if (sortBy === "experience")
      return (b.experienceYears || 0) - (a.experienceYears || 0);
    return b.score - a.score;
  });
  return filtered;
}

function applyFilters() {
  const visible = getVisibleResults();
  resultsCount.textContent =
    allResults.length === 0
      ? ""
      : `Showing ${visible.length} of ${allResults.length} candidates`;
  renderResults(visible);
  renderCompare();
}

// ----- Table -----
function renderResults(results) {
  resultsBody.innerHTML = "";

  if (results.length === 0) {
    resultsBody.innerHTML =
      '<tr><td colspan="6" class="empty-state">No candidates to show. Select a job, or upload resumes first.</td></tr>';
    return;
  }

  results.forEach((r, index) => {
    const row = document.createElement("tr");

    // Compare checkbox
    const checkCell = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selectedIds.includes(r._id);
    checkbox.setAttribute("aria-label", `Compare ${r.candidateName}`);
    checkbox.addEventListener("change", () => toggleCompare(r._id, checkbox));
    checkCell.appendChild(checkbox);

    // Name and email
    const nameCell = document.createElement("td");
    nameCell.appendChild(el("div", "cell-title", r.candidateName || "Unknown"));
    nameCell.appendChild(el("div", "cell-sub", r.email || ""));

    // Score with bar
    const scoreCell = document.createElement("td");
    scoreCell.className = "score-cell";
    scoreCell.appendChild(el("strong", "", `${r.score}%`));
    const bar = el("div", "bar");
    const fill = el("span");
    fill.style.width = `${Math.max(0, Math.min(100, r.score))}%`;
    bar.appendChild(fill);
    scoreCell.appendChild(bar);

    // Details button
    const detailsCell = document.createElement("td");
    const detailsBtn = el("button", "btn btn-outline btn-sm", "View");
    detailsBtn.type = "button";
    detailsCell.appendChild(detailsBtn);

    const expCell = document.createElement("td");
    expCell.textContent = `${r.experienceYears ?? 0} yrs`;

    const rankCell = document.createElement("td");
    rankCell.textContent = index + 1;

    row.appendChild(checkCell);
    row.appendChild(rankCell);
    row.appendChild(nameCell);
    row.appendChild(expCell);
    row.appendChild(scoreCell);
    row.appendChild(detailsCell);
    resultsBody.appendChild(row);

    // Hidden details row (matched, missing, breakdown)
    const detailsRow = document.createElement("tr");
    detailsRow.className = "details-row";
    detailsRow.hidden = true;
    const detailsTd = document.createElement("td");
    detailsTd.colSpan = 6;

    const grid = el("div", "details-grid");
    const matchedBox = el("div");
    matchedBox.appendChild(el("h4", "", "Matched skills"));
    matchedBox.appendChild(makeChips(r.matchedSkills, "chip-matched"));
    const missingBox = el("div");
    missingBox.appendChild(el("h4", "", "Missing skills"));
    missingBox.appendChild(makeChips(r.missingSkills, "chip-missing"));
    const breakdownBox = el("div");
    breakdownBox.appendChild(el("h4", "", "Score breakdown"));
    breakdownBox.appendChild(makeBreakdown(r.breakdown));

    grid.appendChild(matchedBox);
    grid.appendChild(missingBox);
    grid.appendChild(breakdownBox);
    detailsTd.appendChild(grid);
    detailsRow.appendChild(detailsTd);
    resultsBody.appendChild(detailsRow);

    detailsBtn.addEventListener("click", () => {
      detailsRow.hidden = !detailsRow.hidden;
      detailsBtn.textContent = detailsRow.hidden ? "View" : "Hide";
    });
  });
}

// ----- Comparison -----
function toggleCompare(id, checkbox) {
  if (checkbox.checked) {
    if (selectedIds.length >= 2) {
      checkbox.checked = false;
      showPageMessage(
        "You can compare two candidates at a time. Untick one first.",
      );
      return;
    }
    selectedIds.push(id);
  } else {
    selectedIds = selectedIds.filter((x) => x !== id);
  }
  showPageMessage("");
  renderCompare();
}

function renderCompare() {
  const chosen = selectedIds
    .map((id) => allResults.find((r) => r._id === id))
    .filter(Boolean);

  comparePanel.hidden = chosen.length === 0;
  compareGrid.innerHTML = "";
  if (chosen.length === 0) return;

  chosen.forEach((r) => {
    const card = el("div", "compare-card");
    card.appendChild(el("h3", "", r.candidateName || "Unknown"));
    card.appendChild(el("div", "cell-sub", r.email || ""));
    card.appendChild(el("div", "big-score", `${r.score}%`));
    card.appendChild(
      el("div", "cell-sub", `Experience: ${r.experienceYears ?? 0} yrs`),
    );
    card.appendChild(el("h4", "", "Matched skills"));
    card.appendChild(makeChips(r.matchedSkills, "chip-matched"));
    card.appendChild(el("h4", "", "Missing skills"));
    card.appendChild(makeChips(r.missingSkills, "chip-missing"));
    card.appendChild(el("h4", "", "Score breakdown"));
    card.appendChild(makeBreakdown(r.breakdown));
    compareGrid.appendChild(card);
  });

  if (chosen.length === 1) {
    compareGrid.appendChild(
      el("p", "empty-state", "Tick one more candidate to compare."),
    );
  }
}

// ----- Loading data -----
async function loadRanking(jobId) {
  allResults = [];
  selectedIds = [];
  showPageMessage("");

  if (!jobId) {
    applyFilters();
    return;
  }

  try {
    const data = await apiRequest(
      `/rankings?jobId=${encodeURIComponent(jobId)}`,
    );
    allResults = data.results || [];
  } catch (error) {
    showPageMessage(`Could not load the ranking: ${error.message}`);
  }
  applyFilters();
}

async function loadJobs() {
  try {
    const data = await apiRequest("/jobs");
    const jobs = data.jobs || [];

    jobSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = jobs.length ? "Select a job" : "No jobs yet";
    jobSelect.appendChild(placeholder);

    jobs.forEach((job) => {
      const option = document.createElement("option");
      option.value = job._id;
      option.textContent = `${job.title} (${job.company})`;
      jobSelect.appendChild(option);
    });

    const fromUrl = new URLSearchParams(window.location.search).get("jobId");
    if (fromUrl) {
      jobSelect.value = fromUrl;
      loadRanking(fromUrl);
    }
  } catch (error) {
    jobSelect.innerHTML = '<option value="">Could not load jobs</option>';
    showPageMessage(`Could not load jobs: ${error.message}`);
  }
}

jobSelect.addEventListener("change", () => loadRanking(jobSelect.value));
searchInput.addEventListener("input", applyFilters);
minScoreInput.addEventListener("input", applyFilters);
sortSelect.addEventListener("change", applyFilters);

applyFilters();
loadJobs();
