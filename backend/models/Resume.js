const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
  {
    // ----- Who owns it and which job it is for -----
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

    // ----- The uploaded file -----
    originalName: { type: String, required: true, trim: true, maxlength: 255 },
    storedName: { type: String, required: true }, // name on disk (we never trust originalName for paths)
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true, min: 1 },
    fileHash: { type: String, required: true }, // fingerprint of the file content, detects duplicates

    // ----- Information extracted from the resume -----
    // We only extract what ranking needs. No age, gender, religion or photo fields exist.
    candidateName: { type: String, trim: true, maxlength: 100, default: "" },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: "",
    },
    skills: { type: [String], default: [] },
    experienceYears: { type: Number, min: 0, max: 60, default: 0 },
    education: { type: [String], default: [] },

    // Full text is large and private, so it is hidden unless we ask for it
    extractedText: { type: String, select: false, maxlength: 200000 },

    // ----- Did parsing work? -----
    parseStatus: {
      type: String,
      enum: ["parsed", "failed"],
      default: "parsed",
    },
    parseError: { type: String, default: "" },
  },
  { timestamps: true },
);

// The same file cannot be uploaded twice for the same job
resumeSchema.index({ job: 1, fileHash: 1 }, { unique: true });
// Fast "all resumes of this job" and "my latest resumes" queries
resumeSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Resume", resumeSchema);
