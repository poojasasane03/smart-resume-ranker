require("dotenv").config();

const { findProductionProblems } = require("./config/productionChecks");

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing in .env. Add it and restart.");
  process.exit(1);
}

// Online (production) the server refuses to start with unsafe settings
if (process.env.NODE_ENV === "production") {
  const problems = findProductionProblems(process.env);
  if (problems.length > 0) {
    console.error("The server will not start in production, because:");
    problems.forEach((problem) => console.error(` - ${problem}`));
    process.exit(1);
  }
}

const app = require("./app");
const connectDB = require("./config/db");
const Resume = require("./models/Resume");
const RankingResult = require("./models/RankingResult");
const { deleteFile } = require("./services/storageService");
const {
  getRetentionDays,
  createRetentionService,
  startRetentionSchedule,
} = require("./services/retentionService");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // Old resumes are deleted automatically (7 days online, never on your own computer, unless RETENTION_DAYS says otherwise)
  const retentionDays = getRetentionDays(process.env);
  if (retentionDays === null) {
    console.warn(
      "RETENTION_DAYS must be a whole number between 0 and 365, so automatic deletion is off.",
    );
  } else {
    startRetentionSchedule(
      retentionDays,
      createRetentionService({ Resume, RankingResult, deleteFile }),
    );
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();
