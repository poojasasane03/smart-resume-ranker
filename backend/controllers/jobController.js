const Job = require("../models/Job");
const Resume = require("../models/Resume");
const RankingResult = require("../models/RankingResult");
const asyncHandler = require("../utils/asyncHandler");
const { validateJobInput } = require("../utils/validators");
const { deleteFile } = require("../services/storageService");

// Every query below includes { user: req.user._id }, so a recruiter
// can only ever see and change their OWN jobs.

// GET /api/jobs
const getJobs = asyncHandler(async (req, res) => {
  const jobs = await Job.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json({ jobs });
});

// GET /api/jobs/:id
const getJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, user: req.user._id });
  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }
  res.status(200).json({ job });
});

// POST /api/jobs
const createJob = asyncHandler(async (req, res) => {
  const { data, error } = validateJobInput(req.body);
  if (error) {
    return res.status(400).json({ message: error });
  }

  const job = await Job.create({ ...data, user: req.user._id });
  res.status(201).json({ job });
});

// PUT /api/jobs/:id
const updateJob = asyncHandler(async (req, res) => {
  const { data, error } = validateJobInput(req.body);
  if (error) {
    return res.status(400).json({ message: error });
  }

  const job = await Job.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    data,
    { new: true, runValidators: true },
  );
  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }
  res.status(200).json({ job });
});

// DELETE /api/jobs/:id
const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }

  // Remove everything that belonged to this job, including the files on disk
  const resumes = await Resume.find({ job: job._id }).select("storedName");
  await RankingResult.deleteMany({ job: job._id });
  await Resume.deleteMany({ job: job._id });
  await Promise.all(resumes.map((resume) => deleteFile(resume.storedName)));

  res.status(200).json({ message: "Job deleted" });
});

module.exports = { getJobs, getJob, createJob, updateJob, deleteJob };
