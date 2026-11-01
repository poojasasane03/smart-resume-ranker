const jwt = require("jsonwebtoken");

// The token carries only the user id, never a password or other secrets
function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

module.exports = generateToken;
