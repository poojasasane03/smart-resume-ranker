const multer = require("multer");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB per file
const MAX_FILES = 20;

const upload = multer({
  storage: multer.memoryStorage(), // keep files in RAM until we have checked them
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
    fields: 5, // a handful of text fields (we only use jobId)
  },
});

// Expects files under the field name "resumes", same name our frontend uses
const uploadResumeFiles = upload.array("resumes", MAX_FILES);

module.exports = { uploadResumeFiles };
