const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");

const authRoutes = require("./routes/authRoutes");
const jobRoutes = require("./routes/jobRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const rankingRoutes = require("./routes/rankingRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

// ----- Middleware (runs on every request, in this order) -----
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev")); // prints each request in the terminal
}
app.use(express.json({ limit: "1mb" })); // read JSON bodies, refuse huge ones
app.use(express.static(path.join(__dirname, "../frontend"))); // serve the frontend

// ----- Routes -----
app.get("/api/health", (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: "ok",
    message: "Smart Resume Ranker API is running",
    database: dbConnected ? "connected" : "disconnected",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/rankings", rankingRoutes);
// ----- Errors (must come LAST) -----
app.use(notFound);
app.use(errorHandler);

module.exports = app;
