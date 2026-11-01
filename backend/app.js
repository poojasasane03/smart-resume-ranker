const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const app = express();

// Middleware: lets Express read JSON sent in request bodies
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));
// Health check route
app.get("/api/health", (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: "ok",
    message: "Smart Resume Ranker API is running",
    database: dbConnected ? "connected" : "disconnected",
  });
});

// Anything that doesn't match a route above
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

module.exports = app;
