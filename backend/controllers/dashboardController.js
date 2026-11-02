const Job = require("../models/Job");
const Resume = require("../models/Resume");
const RankingResult = require("../models/RankingResult");
const asyncHandler = require("../utils/asyncHandler");
const { FIT_BANDS } = require("../config/scoringConfig");

// GET /api/dashboard/stats
// Every number is counted by the database, only for the logged-in recruiter.
const getStats = asyncHandler(async (req, res) => {
  const owner = { user: req.user._id };

  const [
    totalJobs,
    totalResumes,
    totalAnalyzed,
    average,
    strong,
    possible,
    weak,
    top,
  ] = await Promise.all([
    Job.countDocuments(owner),
    Resume.countDocuments(owner),
    RankingResult.countDocuments(owner),
    RankingResult.aggregate([
      { $match: owner },
      { $group: { _id: null, average: { $avg: "$score" } } },
    ]),
    RankingResult.countDocuments({
      ...owner,
      score: { $gte: FIT_BANDS.strong },
    }),
    RankingResult.countDocuments({
      ...owner,
      score: { $gte: FIT_BANDS.possible, $lt: FIT_BANDS.strong },
    }),
    RankingResult.countDocuments({
      ...owner,
      score: { $lt: FIT_BANDS.possible },
    }),
    RankingResult.find(owner)
      .sort({ score: -1, _id: 1 })
      .limit(5)
      .populate("resume", "candidateName")
      .populate("job", "title"),
  ]);

  res.status(200).json({
    totalResumes,
    totalJobs,
    totalAnalyzed,
    averageScore: average.length > 0 ? Math.round(average[0].average) : 0,
    fit: { strong, possible, weak },
    bands: FIT_BANDS,
    topCandidates: top
      .filter((row) => row.resume && row.job)
      .map((row) => ({
        name: row.resume.candidateName || "Unknown",
        jobTitle: row.job.title,
        score: row.score,
      })),
  });
});

module.exports = { getStats };
