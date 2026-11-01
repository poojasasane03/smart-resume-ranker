requireAuth();

const jobsBody = document.getElementById("jobs-body");
const listMessage = document.getElementById("list-message");
const searchInput = document.getElementById("search");

let allJobs = [];

function showListMessage(text) {
  listMessage.textContent = text;
  listMessage.className = "form-message error";
}

function makeCell(content) {
  const cell = document.createElement("td");
  if (content instanceof Node) {
    cell.appendChild(content);
  } else {
    cell.textContent = content;
  }
  return cell;
}

function makeChips(skills, extraClass, limit) {
  const wrapper = document.createElement("div");
  skills.slice(0, limit).forEach((skill) => {
    const chip = document.createElement("span");
    chip.className = `chip ${extraClass}`;
    chip.textContent = skill;
    wrapper.appendChild(chip);
  });
  if (skills.length > limit) {
    const more = document.createElement("span");
    more.className = "cell-sub";
    more.textContent = `+${skills.length - limit} more`;
    wrapper.appendChild(more);
  }
  return wrapper;
}

function makeTitleCell(job) {
  const box = document.createElement("div");
  const title = document.createElement("div");
  title.className = "cell-title";
  title.textContent = job.title;
  const sub = document.createElement("div");
  sub.className = "cell-sub";
  sub.textContent = job.location
    ? `${job.company} · ${job.location}`
    : job.company;
  box.appendChild(title);
  box.appendChild(sub);
  return box;
}

function makeActionsCell(job) {
  const box = document.createElement("div");
  box.className = "row-actions";

  const editLink = document.createElement("a");
  editLink.className = "btn btn-outline btn-sm";
  editLink.href = `job-form.html?id=${encodeURIComponent(job._id)}`;
  editLink.textContent = "Edit";

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn-danger btn-sm";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => deleteJob(job));

  box.appendChild(editLink);
  box.appendChild(deleteBtn);
  return box;
}

function renderJobs(jobs) {
  jobsBody.innerHTML = "";

  if (jobs.length === 0) {
    jobsBody.innerHTML =
      '<tr><td colspan="4" class="empty-state">No jobs to show. Click "+ New job" to create one.</td></tr>';
    return;
  }

  jobs.forEach((job) => {
    const row = document.createElement("tr");

    const skillsBox = document.createElement("div");
    skillsBox.appendChild(makeChips(job.requiredSkills || [], "", 4));
    skillsBox.appendChild(
      makeChips(job.optionalSkills || [], "chip-optional", 2),
    );

    row.appendChild(makeCell(makeTitleCell(job)));
    row.appendChild(makeCell(`${job.minExperience || 0} yrs`));
    row.appendChild(makeCell(skillsBox));
    row.appendChild(makeCell(makeActionsCell(job)));
    jobsBody.appendChild(row);
  });
}

function applyFilter() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = allJobs.filter(
    (job) =>
      job.title.toLowerCase().includes(query) ||
      job.company.toLowerCase().includes(query),
  );
  renderJobs(filtered);
}

async function deleteJob(job) {
  if (!confirm(`Delete "${job.title}"? This cannot be undone.`)) return;

  try {
    await apiRequest(`/jobs/${job._id}`, "DELETE");
    allJobs = allJobs.filter((j) => j._id !== job._id);
    applyFilter();
  } catch (error) {
    showListMessage(error.message);
  }
}

async function loadJobs() {
  try {
    const data = await apiRequest("/jobs");
    allJobs = data.jobs || [];
    applyFilter();
  } catch (error) {
    showListMessage(`Could not load jobs: ${error.message}`);
    renderJobs([]);
  }
}

searchInput.addEventListener("input", applyFilter);
loadJobs();
