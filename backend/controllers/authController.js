const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const generateToken = require("../utils/generateToken");
const {
  validateRegisterInput,
  validateLoginInput,
} = require("../utils/validators");

// What we are willing to send back about a user (never the password)
function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    company: user.company,
    email: user.email,
    role: user.role,
  };
}

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { data, error } = validateRegisterInput(req.body);
  if (error) {
    return res.status(400).json({ message: error });
  }

  const existing = await User.findOne({ email: data.email });
  if (existing) {
    return res
      .status(409)
      .json({ message: "An account with this email already exists." });
  }

  const user = await User.create(data); // password is hashed by the model hook
  const token = generateToken(user._id);

  res.status(201).json({ token, user: publicUser(user) });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { data, error } = validateLoginInput(req.body);
  if (error) {
    return res.status(400).json({ message: error });
  }

  const user = await User.findOne({ email: data.email }).select("+password");
  const passwordOk = user ? await user.comparePassword(data.password) : false;

  if (!passwordOk) {
    // Same message for "no such email" and "wrong password"
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const token = generateToken(user._id);
  res.status(200).json({ token, user: publicUser(user) });
});

// GET /api/auth/me  (protected)
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ user: publicUser(req.user) });
});

module.exports = { register, login, getMe };
