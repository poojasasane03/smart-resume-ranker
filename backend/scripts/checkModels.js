require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Job = require("../models/Job");
const Resume = require("../models/Resume");
const RankingResult = require("../models/RankingResult");

let passed = 0;
let failed = 0;

function check(label, ok) {
  if (ok) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}`);
  }
}

// Returns true if the promise fails AND the error matches what we expect
async function expectError(promise, isExpected) {
  try {
    await promise;
    return false;
  } catch (error) {
    return isExpected(error);
  }
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB\n");

  // Make sure all indexes (including the unique ones) exist before we test them
  await Promise.all(
    [User, Job, Resume, RankingResult].map((model) => model.init()),
  );

  const stamp = Date.now();
  let user = null;
  let job = null;

  try {
    user = await User.create({
      name: "Check User",
      company: "Check Co",
      email: `check-${stamp}@example.test`,
      password: "Check1234",
    });
    job = await Job.create({
      user: user._id,
      title: "Check Job",
      company: "Check Co",
      requiredSkills: ["Node.js", "MongoDB"],
      description: "A temporary job created by the model check script.",
    });

    const baseResume = (extra = {}) => ({
      user: user._id,
      job: job._id,
      originalName: "sample.pdf",
      storedName: `${stamp}-sample.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 1234,
      fileHash: `hash-${stamp}`,
      candidateName: "Sample Candidate",
      email: "sample@example.test",
      skills: ["Node.js"],
      experienceYears: 3,
      education: ["B.Tech Computer Science"],
      extractedText: "Sample resume text",
      parseStatus: "parsed",
      ...extra,
    });

    console.log("Users");
    const savedUser = await User.findById(user._id).select("+password");
    check(
      "password is stored as a bcrypt hash",
      savedUser.password.startsWith("$2"),
    );

    console.log("\nResumes");
    const resume = await Resume.create(baseResume());

    const plain = await Resume.findById(resume._id);
    check(
      "extractedText is hidden by default",
      plain.extractedText === undefined,
    );

    const withText = await Resume.findById(resume._id).select("+extractedText");
    check(
      "extractedText is available when asked",
      withText.extractedText === "Sample resume text",
    );

    check(
      "same file twice for the same job is rejected",
      await expectError(
        Resume.create(baseResume({ storedName: `${stamp}-copy.pdf` })),
        (e) => e.code === 11000,
      ),
    );

    check(
      "resume without a job is rejected",
      await expectError(
        Resume.create({
          ...baseResume({ fileHash: `other-${stamp}` }),
          job: undefined,
        }),
        (e) => e.name === "ValidationError",
      ),
    );

    console.log("\nRanking results");
    await RankingResult.create({
      user: user._id,
      job: job._id,
      resume: resume._id,
      score: 78,
      matchedSkills: ["Node.js"],
      missingSkills: ["MongoDB"],
      breakdown: [
        { key: "required", label: "Required skills", score: 50, weight: 50 },
      ],
      algorithmVersion: "check-1",
    });

    const results = await RankingResult.find({ job: job._id })
      .populate("resume", "candidateName email experienceYears")
      .populate("job", "title");

    check(
      "populate brings the candidate name from the resume",
      results.length === 1 &&
        results[0].resume.candidateName === "Sample Candidate",
    );
    check(
      "populate brings the job title",
      results[0].job.title === "Check Job",
    );

    check(
      "a second result for the same job + resume is rejected",
      await expectError(
        RankingResult.create({
          user: user._id,
          job: job._id,
          resume: resume._id,
          score: 50,
        }),
        (e) => e.code === 11000,
      ),
    );

    check(
      "a score above 100 is rejected",
      await expectError(
        RankingResult.create({
          user: user._id,
          job: job._id,
          resume: new mongoose.Types.ObjectId(),
          score: 150,
        }),
        (e) => e.name === "ValidationError",
      ),
    );
  } finally {
    // Always clean up the temporary data, even if a check crashed
    if (job) {
      await RankingResult.deleteMany({ job: job._id });
      await Resume.deleteMany({ job: job._id });
      await Job.deleteOne({ _id: job._id });
    }
    if (user) {
      await User.deleteOne({ _id: user._id });
    }
    console.log("\nTemporary test data removed.");
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(async (error) => {
  console.error("Check script crashed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
