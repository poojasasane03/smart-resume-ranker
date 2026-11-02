const express = require("express");
const {
  uploadResumes,
  getResumes,
  deleteResume,
} = require("../controllers/resumeController");
const { uploadResumeFiles } = require("../middleware/uploadMiddleware");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// protect runs FIRST, so a visitor who is not logged in never gets their files read
router.use(protect);

router.post("/upload", uploadResumeFiles, uploadResumes);
router.get("/", getResumes);
router.delete("/:id", deleteResume);

module.exports = router;
