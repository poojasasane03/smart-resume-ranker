requireAuth();

const sidebar = document.getElementById("sidebar");
document.getElementById("sidebar-toggle").addEventListener("click", () => {
  sidebar.classList.toggle("open");
});
document.getElementById("logout-btn").addEventListener("click", logout);

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function showStats(stats) {
  setText("stat-resumes", stats.totalResumes);
  setText("stat-jobs", stats.totalJobs);
  setText("stat-analyzed", stats.totalAnalyzed);
  setText("stat-average", `${stats.averageScore}%`);

  setText("fit-strong", stats.fit.strong);
  setText("fit-possible", stats.fit.possible);
  setText("fit-weak", stats.fit.weak);
  if (stats.bands) {
    setText(
      "fit-note",
      `Strong match: ${stats.bands.strong}% and above. Possible: ${stats.bands.possible}% to ${stats.bands.strong - 1}%. Weak: below ${stats.bands.possible}%.`,
    );
  }

  const body = document.getElementById("top-candidates-body");
  body.innerHTML = "";

  if (!stats.topCandidates || stats.topCandidates.length === 0) {
    body.innerHTML =
      '<tr><td colspan="4" class="empty-state">No candidates yet. Create a job and upload resumes to see rankings here.</td></tr>';
    return;
  }

  stats.topCandidates.forEach((c, index) => {
    const row = document.createElement("tr");
    [index + 1, c.name, c.jobTitle, `${c.score}%`].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value; // textContent keeps user data safe from HTML injection
      row.appendChild(cell);
    });
    body.appendChild(row);
  });
}

async function loadDashboard() {
  const emptyStats = {
    totalResumes: 0,
    totalJobs: 0,
    totalAnalyzed: 0,
    averageScore: 0,
    fit: { strong: 0, possible: 0, weak: 0 },
    topCandidates: [],
  };

  try {
    const stats = await apiRequest("/dashboard/stats");
    showStats(stats);
  } catch (error) {
    // The stats API does not exist yet (we build it in Phase 8), so show zeros
    console.log("Dashboard stats not available yet:", error.message);
    showStats(emptyStats);
  }
}

loadDashboard();
