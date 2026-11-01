const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Canteen = require("../models/Canteen");
const { revokeUserSockets } = require("../socket");
const { setAuthCookie, clearAuthCookie } = require("../middleware/authCookie");

const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, tokenVersion: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: "7d", algorithm: "HS256" }
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

    setAuthCookie(res, signToken(user));
    res.status(201).json({ user });
  } catch (err) {
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

    setAuthCookie(res, signToken(user));
    res.json({ user }); // toJSON strips passwordHash
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
exports.me = async (req, res, next) => {
  try {
    let managedCanteenNames = [];
    if (req.user.role === "admin") {
      managedCanteenNames = await Canteen.find({}).select("name").sort({ name: 1 });
    } else if (req.user.role === "canteen") {
      managedCanteenNames = await Canteen.find({
        _id: { $in: req.user.managedCanteens || [] },
      }).select("name").sort({ name: 1 });
    }

    res.json({
      user: req.user,
      managedCanteenNames: managedCanteenNames.map((canteen) => canteen.name),
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/auth/me
exports.updateProfile = async (req, res, next) => {
  try {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ message: "Profile details must be an object" });
    }

    const user = await User.findById(req.user._id).select("+passwordHash");
    if (!user) return res.status(404).json({ message: "User no longer exists" });

    const has = (field) => Object.prototype.hasOwnProperty.call(body, field);
    if (has("name")) {
      if (typeof body.name !== "string") {
        return res.status(400).json({ message: "Name must be 2 to 50 characters" });
      }
      const name = body.name.trim();
      if (name.length < 2 || name.length > 50) {
        return res.status(400).json({ message: "Name must be 2 to 50 characters" });
      }
      user.name = name;
    }

    if (has("phone")) {
      if (typeof body.phone !== "string" || !/^[6-9]\d{9}$/.test(body.phone.trim())) {
        return res.status(400).json({ message: "Phone must be a 10-digit mobile number" });
      }
      user.phone = body.phone.trim();
    }

    if (has("email")) {
      if (typeof body.email !== "string") {
        return res.status(400).json({ message: "Enter a valid email address" });
      }
      const email = body.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Enter a valid email address" });
      }
      if (email !== user.email) {
        if (typeof body.currentPassword !== "string" || !body.currentPassword) {
          return res.status(400).json({ message: "Current password is required to change email" });
        }
        if (!(await bcrypt.compare(body.currentPassword, user.passwordHash))) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
        const existing = await User.findOne({ email, _id: { $ne: user._id } });
        if (existing) return res.status(409).json({ message: "Email already registered" });
      }
      user.email = email;
    }

    for (const field of ["rollNumber", "department", "avatarUrl"]) {
      if (!has(field)) continue;
      if (body[field] !== null && typeof body[field] !== "string") {
        return res.status(400).json({ message: `${field} must be text` });
      }
      const value = typeof body[field] === "string" ? body[field].trim() : "";
      if (field === "avatarUrl" && value && !/^https?:\/\//i.test(value)) {
        return res.status(400).json({ message: "Avatar URL must start with http:// or https://" });
      }
      user[field] = value;
    }

    if (has("year")) {
      if (body.year === "" || body.year === null) {
        user.year = undefined;
      } else {
        const year = Number(body.year);
        if (
          (typeof body.year !== "number" && typeof body.year !== "string") ||
          !Number.isInteger(year) ||
          year < 1 ||
          year > 6
        ) {
          return res.status(400).json({ message: "Year must be between 1 and 6" });
        }
        user.year = year;
      }
    }

    await user.save();
    res.json({ user });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "Email already registered" });
    next(err);
  }
};

// POST /api/auth/logout
exports.logout = (req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out successfully" });
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
    setAuthCookie(res, signToken(user));
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
};