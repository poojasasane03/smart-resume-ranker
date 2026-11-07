// Prints how the exact score and the language data (semantic similarity, hints) look for one job.
// Run from the backend folder:
//   node scripts/semanticReport.js JOB_ID
//   node scripts/semanticReport.js JOB_ID --names       (shows candidate names, do NOT paste that anywhere)
//   node scripts/semanticReport.js JOB_ID --no-lines    (hides the resume lines)
require("dotenv").config();
const mongoose = require("mongoose");
const Job = require("../models/Job");
require("../models/Resume"); // needed so that populate("resume") works
const RankingResult = require("../models/RankingResult");
const { buildReport } = require("../services/semanticReportService");

async function run() {
  const args = process.argv.slice(2);
  const jobId = args.find((arg) => !arg.startsWith("--"));

  if (!mongoose.isValidObjectId(jobId)) {
    console.log(
      "Usage: node scripts/semanticReport.js JOB_ID [--names] [--no-lines]",
    );
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const job = await Job.findById(jobId).select("title");
  if (!job) {
    console.log("No job with this id.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const rows = await RankingResult.find({ job: job._id })
    .sort({ score: -1, _id: 1 })
    .populate("resume", "candidateName");

  console.log(
    buildReport(job.title, rows, {
      showNames: args.includes("--names"),
      showLines: !args.includes("--no-lines"),
    }),
  );

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Report failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
