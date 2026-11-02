const express = require("express");
const rateLimit = require("express-rate-limit");
const { runRanking, getRankings } = require("../controllers/rankingController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// Ranking reads many resumes, so we limit how often it can be run
const runLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many ranking runs. Please wait a few minutes." },
});

router.get("/", getRankings);
router.post("/run", runLimiter, runRanking);

module.exports = router;
