const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const Canteen = require("../models/Canteen");

// returns an array of valid, existing canteen ids, or null if any is bad
const validCanteenIds = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) return null;
  if (!ids.every((id) => mongoose.isValidObjectId(id))) return null;
  const unique = [...new Set(ids.map(String))];
  const count = await Canteen.countDocuments({ _id: { $in: unique } });
  return count === unique.length ? unique : null;
};

// POST /api/admin/staff  body: { name, email, phone, password, canteenIds: [] }
exports.createStaff = async (req, res, next) => {
  try {
    const { name, email, phone, password, canteenIds } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "name, email, phone and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    const ids = await validCanteenIds(canteenIds);
    if (!ids) {
      return res.status(400).json({ message: "canteenIds must be a non-empty list of valid canteens" });
    }
    if (await User.findOne({ email: email.toLowerCase().trim() })) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name, email, phone, passwordHash, role: "canteen", managedCanteens: ids,
    });
    res.status(201).json(user);
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
    next(err);
  }
};

// PATCH /api/admin/users/:id/canteens  body: { canteenIds: [] }  (staff only)
exports.assignCanteens = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    const ids = await validCanteenIds(req.body.canteenIds);
    if (!ids) {
      return res.status(400).json({ message: "canteenIds must be a non-empty list of valid canteens" });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role !== "canteen") {
      return res.status(400).json({ message: "Only canteen staff accounts can be assigned canteens" });
    }

    user.managedCanteens = ids;
    await user.save();
    res.json(user);
  } catch (err) {
    next(err);
  }
};