const mongoose = require("mongoose");
const Job = require("../models/Job");
const Resume = require("../models/Resume");
const RankingResult = require("../models/RankingResult");
const asyncHandler = require("../utils/asyncHandler");
const { scoreResume, resolveWeights } = require("../services/scoringService");
const { FIT_BANDS } = require("../config/scoringConfig");
const { nlpClient } = require("../services/nlpClient");
const { buildCsv, writePdf } = require("../services/reportService");

// Builds the response the ranking page needs
async function buildRankingResponse(userId, jobId) {
  const [rows, parsedCount] = await Promise.all([
    RankingResult.find({ user: userId, job: jobId })
      .sort({ score: -1, _id: 1 })
      .populate("resume", "candidateName email experienceYears"),
    Resume.countDocuments({ user: userId, job: jobId, parseStatus: "parsed" }),
  ]);

  const results = rows
    .filter((row) => row.resume) // skip results whose resume was deleted
    .map((row) => ({
      _id: row._id,
      candidateName: row.resume.candidateName,
      email: row.resume.email,
      experienceYears: row.resume.experienceYears,
      score: row.score,
      matchedSkills: row.matchedSkills,
      missingSkills: row.missingSkills,
      breakdown: row.breakdown,
      semantic: row.semantic || null,
      updatedAt: row.updatedAt,
    }));

  return {
    results,
    bands: FIT_BANDS,
    summary: {
      parsedResumes: parsedCount,
      ranked: results.length,
      unranked: Math.max(0, parsedCount - results.length),
    },
  };
}

// Asks the Python NLP service for language hints. It never changes the score and never fails the ranking.
async function getSemanticAnalysis(job, resumes, scored) {
  const exactMissing = new Map(
    scored.map((item) => [String(item.resumeId), item.exactMissing]),
  );

  const items = resumes.map((resume) => ({
    id: String(resume._id),
    text: resume.extractedText,
    // The name and email are removed from the text before the model sees it
    redact: [resume.candidateName, resume.email]
      .filter((term) => term && term.trim().length >= 2)
      .map((term) => term.trim().slice(0, 100)),
    missingSkills: exactMissing.get(String(resume._id)) || [],
  }));

  return nlpClient.analyzeResumes({
    jobText: `${job.title}\n${job.description}`,
    items,
  });
}

// POST /api/rankings/run   body: { jobId, weights? }
const runRanking = asyncHandler(async (req, res) => {
  const { jobId, weights: weightOverrides } = req.body || {};

  if (!mongoose.isValidObjectId(jobId)) {
    return res.status(400).json({ message: "Please select a job." });
  }

  const { weights, error } = resolveWeights(weightOverrides);
  if (error) {
    return res.status(400).json({ message: error });
  }

  // The job must belong to the logged-in recruiter
  const job = await Job.findOne({ _id: jobId, user: req.user._id });
  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }

  // Only resumes we could read are ranked. The full text is hidden by default, so we ask for it.
  const resumes = await Resume.find({
    user: req.user._id,
    job: job._id,
    parseStatus: "parsed",
  }).select("+extractedText");

  if (resumes.length === 0) {
    return res.status(400).json({
      message:
        "There are no readable resumes for this job yet. Upload resumes first.",
    });
  }

  // Score everything first. If a weight problem throws, nothing is saved.
  const scored = resumes.map((resume) => ({
    resumeId: resume._id,
    ...scoreResume(job, resume, weights),
  }));

  // Optional language hints from the Python service (the score stays exactly as before)
  const semantic = await getSemanticAnalysis(job, resumes, scored);

  // One result per resume per job: update it if it exists, create it if not
  await RankingResult.bulkWrite(
    scored.map((item) => ({
      updateOne: {
        filter: { job: job._id, resume: item.resumeId },
        update: {
          $set: {
            user: req.user._id,
            score: item.score,
            matchedSkills: item.matchedSkills,
            missingSkills: item.missingSkills,
            breakdown: item.breakdown,
            algorithmVersion: item.algorithmVersion,
            ...(semantic.byId.has(String(item.resumeId))
              ? { semantic: semantic.byId.get(String(item.resumeId)) }
              : {}),
          },
        },
        upsert: true,
      },
    })),
  );

  const response = await buildRankingResponse(req.user._id, job._id);
  res.status(200).json({
    ...response,
    weightsUsed: weights,
    semanticStatus: semantic.status,
  });
});

// GET /api/rankings?jobId=...
const getRankings = asyncHandler(async (req, res) => {
  const { jobId } = req.query;
  if (!mongoose.isValidObjectId(jobId)) {
    return res.status(400).json({ message: "A valid jobId is required." });
  }

  const response = await buildRankingResponse(req.user._id, jobId);
  res.status(200).json(response);
});

// "Backend Developer!" -> "backend-developer" (safe to use inside a file name)
function slugify(text) {
  const slug = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "job";
}

// GET /api/rankings/export?jobId=...&format=csv|pdf
const exportRanking = asyncHandler(async (req, res) => {
  const { jobId, format = "csv" } = req.query;

  if (!mongoose.isValidObjectId(jobId)) {
    return res.status(400).json({ message: "A valid jobId is required." });
  }
  if (format !== "csv" && format !== "pdf") {
    return res.status(400).json({ message: "Format must be csv or pdf." });
  }

  const job = await Job.findOne({ _id: jobId, user: req.user._id });
  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }

  const { results } = await buildRankingResponse(req.user._id, job._id);
  if (results.length === 0) {
    return res.status(400).json({
      message: "There is nothing to export yet. Run the ranking first.",
    });
  }

  const fileName = `ranking-${slugify(job.title)}.${format}`;
  res.attachment(fileName); // sets Content-Disposition and the content type

  if (format === "csv") {
    return res.send(buildCsv(results));
  }
  writePdf(res, job, results);
});

module.exports = { runRanking, getRankings, exportRanking };
