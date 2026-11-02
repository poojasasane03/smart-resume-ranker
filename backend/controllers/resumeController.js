const mongoose = require("mongoose");
const Job = require("../models/Job");
const Resume = require("../models/Resume");
const RankingResult = require("../models/RankingResult");
const asyncHandler = require("../utils/asyncHandler");
const {
  ALLOWED_TYPES,
  getExtension,
  hasValidSignature,
  hashBuffer,
  extractText,
} = require("../services/parserService");
const { extractInfo } = require("../services/extractionService");
const { saveFile, deleteFile } = require("../services/storageService");

// What we send back about a resume (never the full text or the stored file name)
function publicResume(resume) {
  return {
    id: resume._id,
    originalName: resume.originalName,
    candidateName: resume.candidateName,
    email: resume.email,
    skills: resume.skills,
    experienceYears: resume.experienceYears,
    education: resume.education,
    parseStatus: resume.parseStatus,
    parseError: resume.parseError,
    sizeBytes: resume.sizeBytes,
    createdAt: resume.createdAt,
  };
}

// POST /api/resumes/upload  (multipart: jobId + resumes[])
const uploadResumes = asyncHandler(async (req, res) => {
  const { jobId } = req.body;

  // isValidObjectId also blocks tricks like jobId={"$ne":""}
  if (!mongoose.isValidObjectId(jobId)) {
    return res.status(400).json({ message: "Please select a job." });
  }

  // The job must belong to the logged-in recruiter
  const job = await Job.findOne({ _id: jobId, user: req.user._id });
  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }

  const files = req.files || [];
  if (files.length === 0) {
    return res.status(400).json({ message: "Please add at least one resume." });
  }

  const summary = {
    total: files.length,
    parsed: 0,
    failed: 0,
    duplicates: 0,
    rejected: 0,
  };
  const resumes = [];
  const problems = [];

  const addProblem = (fileName, reason) => problems.push({ fileName, reason });

  // One file at a time: simple, and a duplicate inside the same batch is also caught
  for (const file of files) {
    const ext = getExtension(file.originalname);

    // 1. Is it an allowed type?
    if (!ALLOWED_TYPES[ext]) {
      summary.rejected++;
      addProblem(file.originalname, "Only PDF and DOCX files are allowed.");
      continue;
    }

    // 2. Does the content really look like that type?
    if (!hasValidSignature(file.buffer, ext)) {
      summary.rejected++;
      addProblem(
        file.originalname,
        "The file content does not match a real PDF or DOCX.",
      );
      continue;
    }

    // 3. Was this exact file already uploaded for this job?
    const fileHash = hashBuffer(file.buffer);
    const existing = await Resume.findOne({ job: job._id, fileHash }).select(
      "_id",
    );
    if (existing) {
      summary.duplicates++;
      addProblem(file.originalname, "Already uploaded for this job.");
      continue;
    }

    // 4. Read the text and extract information. A failure here is not fatal.
    let text = "";
    let info = {};
    let parseStatus = "parsed";
    let parseError = "";

    try {
      text = await extractText(file.buffer, ext);
      if (!text) {
        parseStatus = "failed";
        parseError = "No readable text found. The file may be a scanned image.";
      } else {
        info = extractInfo(text, file.originalname);
      }
    } catch (error) {
      console.error(`Parsing failed for ${file.originalname}:`, error.message);
      parseStatus = "failed";
      parseError =
        "Could not read this file. It may be damaged or password protected.";
    }

    // 5. Save the file, then the database record
    const storedName = await saveFile(file.buffer, ext);
    try {
      const resume = await Resume.create({
        user: req.user._id,
        job: job._id,
        originalName: file.originalname.slice(0, 255),
        storedName,
        mimeType: ALLOWED_TYPES[ext],
        sizeBytes: file.size,
        fileHash,
        ...info,
        extractedText: text,
        parseStatus,
        parseError,
      });

      resumes.push(publicResume(resume));

      if (parseStatus === "parsed") {
        summary.parsed++;
      } else {
        summary.failed++;
        addProblem(file.originalname, parseError);
      }
    } catch (error) {
      await deleteFile(storedName); // do not leave an orphan file behind

      if (error.code === 11000) {
        // two uploads of the same file raced each other
        summary.duplicates++;
        addProblem(file.originalname, "Already uploaded for this job.");
        continue;
      }
      throw error;
    }
  }

  const status = summary.parsed + summary.failed > 0 ? 201 : 200;
  res.status(status).json({ summary, resumes, problems });
});

// GET /api/resumes?jobId=...
const getResumes = asyncHandler(async (req, res) => {
  const { jobId } = req.query;
  if (!mongoose.isValidObjectId(jobId)) {
    return res.status(400).json({ message: "A valid jobId is required." });
  }

  const resumes = await Resume.find({ user: req.user._id, job: jobId }).sort({
    createdAt: -1,
  });
  res.status(200).json({ resumes: resumes.map(publicResume) });
});

// DELETE /api/resumes/:id
const deleteResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!resume) {
    return res.status(404).json({ message: "Resume not found" });
  }

  await RankingResult.deleteMany({ resume: resume._id });
  await deleteFile(resume.storedName);

  res.status(200).json({ message: "Resume deleted" });
});

module.exports = { uploadResumes, getResumes, deleteResume };
