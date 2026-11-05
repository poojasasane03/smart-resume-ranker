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
// Language hints from the Python NLP service. They are shown to the recruiter but do not change the score (yet).
const semanticSchema = new mongoose.Schema(
  {
    similarity: { type: Number, default: null },
    model: { type: String, default: "" },
    skillHints: [
      {
        _id: false,
        skill: String,
        line: String,
        similarity: Number,
        margin: Number,
      },
    ],
  },
  { _id: false },
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

    semantic: { type: semanticSchema, default: null },

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
