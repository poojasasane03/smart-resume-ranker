const mongoose = require("mongoose");

// One line of the score breakdown, e.g. { key: "required", label: "Required skills", score: 80, weight: 50 }
const breakdownSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    weight: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }, // these are small embedded items, they do not need their own id
);

const rankingResultSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    resume: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      required: true,
    },

    score: { type: Number, required: true, min: 0, max: 100 },
    matchedSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    breakdown: { type: [breakdownSchema], default: [] },

    // Which version of the scoring formula produced this result
    algorithmVersion: { type: String, default: "1.0" },
  },
  { timestamps: true },
);

// One result per resume per job. Re-ranking updates it instead of adding a duplicate.
rankingResultSchema.index({ job: 1, resume: 1 }, { unique: true });
// Fast "top candidates of this job" query
rankingResultSchema.index({ job: 1, score: -1 });

module.exports = mongoose.model("RankingResult", rankingResultSchema);
