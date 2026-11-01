requireAuth();

const jobForm = document.getElementById("job-form");
const messageBox = document.getElementById("form-message");
const submitBtn = document.getElementById("submit-btn");

// If the URL is job-form.html?id=abc123 we are editing, otherwise creating
const jobId = new URLSearchParams(window.location.search).get("id");

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = `form-message ${type}`;
}

// "Node.js, express,  node.js" -> ["Node.js", "express"]
function parseSkills(text) {
  const seen = new Set();
  const skills = [];
  text.split(",").forEach((item) => {
    const skill = item.trim();
    const key = skill.toLowerCase();
    if (skill && !seen.has(key)) {
      seen.add(key);
      skills.push(skill);
    }
  });
  return skills;
}

function readForm() {
  return {
    title: document.getElementById("title").value.trim(),
    company: document.getElementById("company").value.trim(),
    location: document.getElementById("location").value.trim(),
    minExperience: Number(document.getElementById("min-experience").value),
    requiredSkills: parseSkills(
      document.getElementById("required-skills").value,
    ),
    optionalSkills: parseSkills(
      document.getElementById("optional-skills").value,
    ),
    description: document.getElementById("description").value.trim(),
  };
}

function validateJob(job) {
  if (job.title.length < 3)
    return "Please enter a job title (at least 3 characters).";
  if (job.company.length < 2) return "Please enter the company name.";
  if (
    Number.isNaN(job.minExperience) ||
    job.minExperience < 0 ||
    job.minExperience > 50
  ) {
    return "Minimum experience must be a number between 0 and 50.";
  }
  if (job.requiredSkills.length === 0)
    return "Add at least one required skill.";

  const requiredKeys = job.requiredSkills.map((s) => s.toLowerCase());
  const overlap = job.optionalSkills.filter((s) =>
    requiredKeys.includes(s.toLowerCase()),
  );
  if (overlap.length > 0) {
    return `"${overlap[0]}" is in both lists. Keep it in required skills only.`;
  }

  if (job.description.length < 30)
    return "The job description should be at least 30 characters.";
  return null;
}

function fillForm(job) {
  document.getElementById("title").value = job.title || "";
  document.getElementById("company").value = job.company || "";
  document.getElementById("location").value = job.location || "";
  document.getElementById("min-experience").value = job.minExperience ?? 0;
  document.getElementById("required-skills").value = (
    job.requiredSkills || []
  ).join(", ");
  document.getElementById("optional-skills").value = (
    job.optionalSkills || []
  ).join(", ");
  document.getElementById("description").value = job.description || "";
}

async function loadJobForEdit() {
  document.getElementById("page-title").textContent = "Edit job";
  document.getElementById("page-sub").textContent =
    "Update the details of this job.";
  try {
    const data = await apiRequest(`/jobs/${encodeURIComponent(jobId)}`);
    fillForm(data.job);
  } catch (error) {
    showMessage(`Could not load this job: ${error.message}`, "error");
  }
}

jobForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const job = readForm();
  const error = validateJob(job);
  if (error) {
    showMessage(error, "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Saving...";

  try {
    if (jobId) {
      await apiRequest(`/jobs/${encodeURIComponent(jobId)}`, "PUT", job);
    } else {
      await apiRequest("/jobs", "POST", job);
    }
    showMessage("Job saved! Redirecting...", "success");
    setTimeout(() => (window.location.href = "jobs.html"), 800);
  } catch (err) {
    showMessage(err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Save job";
  }
});

if (jobId) loadJobForEdit();
