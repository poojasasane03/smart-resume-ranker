const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
      minlength: [3, "Job title must be at least 3 characters"],
      maxlength: [100, "Job title must be at most 100 characters"],
    },
    company: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      minlength: [2, "Company name must be at least 2 characters"],
      maxlength: [100, "Company name must be at most 100 characters"],
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, "Location must be at most 100 characters"],
      default: "",
    },
    minExperience: {
      type: Number,
      min: [0, "Experience cannot be negative"],
      max: [50, "Experience cannot be more than 50 years"],
      default: 0,
    },
    requiredSkills: {
      type: [String],
      validate: {
        validator: (skills) => skills.length > 0,
        message: "At least one required skill is needed",
      },
    },
    optionalSkills: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      required: [true, "Job description is required"],
      trim: true,
      minlength: [30, "Job description must be at least 30 characters"],
      maxlength: [5000, "Job description must be at most 5000 characters"],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Job", jobSchema);
