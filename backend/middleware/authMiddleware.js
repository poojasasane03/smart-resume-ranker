const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

// Put this before any route that needs a logged-in user
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Please log in to continue." });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    const message =
      error.name === "TokenExpiredError"
        ? "Your session has expired. Please log in again."
        : "Invalid login. Please log in again.";
    return res.status(401).json({ message });
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return res.status(401).json({ message: "This account no longer exists." });
  }

  req.user = user; // controllers after this can use req.user
  next();
});

module.exports = { protect };
