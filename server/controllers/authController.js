const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { revokeUserSockets } = require("../socket");

const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, tokenVersion: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "name, email, phone and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ message: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    // role is NOT taken from the body, so nobody can self-register as canteen/admin
    const user = await User.create({ name, email, phone, passwordHash });

    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    // passwordHash is select:false, so ask for it explicitly
    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select("+passwordHash +tokenVersion");
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({ token: signToken(user), user }); // toJSON strips passwordHash
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
exports.me = (req, res) => {
  res.json({ user: req.user });
};

// PATCH /api/auth/password  body: { currentPassword, newPassword }
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      return res.status(400).json({ message: "currentPassword and newPassword are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id).select("+passwordHash +tokenVersion");
    if (!user) return res.status(404).json({ message: "User no longer exists" });
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      return res.status(400).json({ message: "New password must be different" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    revokeUserSockets(user._id);
    res.json({ token: signToken(user), message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
};