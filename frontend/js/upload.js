requireAuth();

const MAX_FILES = 20;
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = [".pdf", ".docx"];

const uploadForm = document.getElementById("upload-form");
const jobSelect = document.getElementById("job-select");
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const fileListEl = document.getElementById("file-list");
const messageBox = document.getElementById("form-message");
const submitBtn = document.getElementById("submit-btn");

let selectedFiles = [];

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = `form-message ${type}`;
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function hasAllowedExtension(name) {
  const lower = name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function addFiles(fileList) {
  const problems = [];

  Array.from(fileList).forEach((file) => {
    if (!hasAllowedExtension(file.name)) {
      problems.push(`"${file.name}" is not a PDF or DOCX file.`);
    } else if (file.size > MAX_SIZE) {
      problems.push(`"${file.name}" is larger than 5 MB.`);
    } else if (file.size === 0) {
      problems.push(`"${file.name}" is empty.`);
    } else if (
      selectedFiles.some((f) => f.name === file.name && f.size === file.size)
    ) {
      problems.push(`"${file.name}" is already added.`);
    } else if (selectedFiles.length >= MAX_FILES) {
      problems.push(`You can upload at most ${MAX_FILES} files at once.`);
    } else {
      selectedFiles.push(file);
    }
  });

  if (problems.length > 0) {
    // Show the first problem and how many more there are
    const extra =
      problems.length > 1 ? ` (+${problems.length - 1} more skipped)` : "";
    showMessage(problems[0] + extra, "error");
  } else {
    messageBox.className = "form-message";
  }

  renderFiles();
}

function renderFiles() {
  fileListEl.innerHTML = "";

  selectedFiles.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "file-item";

    const name = document.createElement("span");
    name.className = "file-name";
    name.textContent = file.name; // textContent: file names can contain odd characters

    const size = document.createElement("span");
    size.className = "file-size";
    size.textContent = formatSize(file.size);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "file-remove";
    remove.setAttribute("aria-label", `Remove ${file.name}`);
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      selectedFiles.splice(index, 1);
      renderFiles();
    });

    item.appendChild(name);
    item.appendChild(size);
    item.appendChild(remove);
    fileListEl.appendChild(item);
  });
}

// ----- Dropzone events -----
dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener("change", () => {
  addFiles(fileInput.files);
  fileInput.value = ""; // lets the user pick the same file again later
});

["dragenter", "dragover"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  }),
);

["dragleave", "drop"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
  }),
);

dropzone.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));

// ----- Load jobs into the dropdown -----
async function loadJobs() {
  try {
    const data = await apiRequest("/jobs");
    const jobs = data.jobs || [];

    jobSelect.innerHTML = "";
    if (jobs.length === 0) {
      jobSelect.innerHTML =
        '<option value="">No jobs yet. Create a job first.</option>';
      return;
    }

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a job";
    jobSelect.appendChild(placeholder);

    jobs.forEach((job) => {
      const option = document.createElement("option");
      option.value = job._id;
      option.textContent = `${job.title} (${job.company})`;
      jobSelect.appendChild(option);
    });

    // Preselect if we came from a link like upload.html?jobId=abc
    const preselect = new URLSearchParams(window.location.search).get("jobId");
    if (preselect) jobSelect.value = preselect;
  } catch (error) {
    jobSelect.innerHTML = '<option value="">Could not load jobs</option>';
    showMessage(`Could not load jobs: ${error.message}`, "error");
  }
}

// ----- Submit -----
uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!jobSelect.value) {
    showMessage("Please select a job.", "error");
    return;
  }
  if (selectedFiles.length === 0) {
    showMessage("Please add at least one resume.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("jobId", jobSelect.value);
  selectedFiles.forEach((file) => formData.append("resumes", file));

  submitBtn.disabled = true;
  submitBtn.textContent = "Uploading...";

  try {
    const result = await apiRequest("/resumes/upload", "POST", formData);
    const s = result.summary;

    const lines = [`${s.parsed} of ${s.total} resume(s) read successfully.`];
    result.problems.forEach((p) => lines.push(`• ${p.fileName}: ${p.reason}`));
    showMessage(lines.join("\n"), s.parsed > 0 ? "success" : "error");

    if (s.parsed > 0) {
      selectedFiles = [];
      renderFiles();
    }
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Upload and analyse";
  }
});

loadJobs();
