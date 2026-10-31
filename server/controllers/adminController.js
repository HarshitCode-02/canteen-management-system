const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const Canteen = require("../models/Canteen");
const Order = require("../models/Order");
const { emitToUser, revokeUserSockets } = require("../socket");
const { writeAudit } = require("../services/auditLog");

// GET /api/admin/overview
exports.getAdminOverview = async (req, res, next) => {
  try {
    const [canteens, owners, blockedUsers] = await Promise.all([
      Canteen.find().sort({ name: 1 }),
      User.find({ role: "canteen" })
        .select("name email phone managedCanteens")
        .populate("managedCanteens", "name slug")
        .sort({ name: 1 }),
      User.find({ role: { $in: ["student", "teacher"] }, isBlocked: true })
        .select("name email phone noShowCount blockedAt")
        .sort({ blockedAt: -1 }),
    ]);

    res.json({ canteens, owners, blockedUsers });
  } catch (err) {
    next(err);
  }
};

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
    await writeAudit(req, {
      eventType: "staff.created",
      entityType: "user",
      entityId: user._id,
      details: { role: user.role, canteenCount: ids.length },
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
    await writeAudit(req, {
      eventType: "staff.canteens_changed",
      entityType: "user",
      entityId: user._id,
      details: { canteenCount: ids.length },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/:id/unblock
exports.unblockUser = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const unpaidNoShow = await Order.exists({
      user: req.params.id,
      status: "no_show",
      paymentStatus: { $ne: "paid" },
    });
    if (unpaidNoShow) {
      return res.status(409).json({
        message: "Confirm counter payment for every no-show order before unblocking this user",
      });
    }

    const user = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        role: { $in: ["student", "teacher"] },
        isBlocked: true,
      },
      { $set: { isBlocked: false, noShowCount: 0 }, $unset: { blockedAt: 1 } },
      { new: true }
    ).select("name");

    if (!user) return res.status(404).json({ message: "Blocked student or teacher not found" });
    await writeAudit(req, {
      eventType: "user.unblocked",
      entityType: "user",
      entityId: user._id,
    });
    emitToUser(req.params.id, "accountUpdated", {});
    res.json({ message: `${user.name} has been unblocked` });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/:id/password  body: { newPassword }
exports.resetStaffPassword = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    const { newPassword } = req.body;
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findOne({ _id: req.params.id, role: "canteen" })
      .select("+passwordHash +tokenVersion");
    if (!user) return res.status(404).json({ message: "Canteen owner not found" });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    await writeAudit(req, {
      eventType: "user.password_reset",
      entityType: "user",
      entityId: user._id,
      details: { role: user.role },
    });
    revokeUserSockets(user._id);
    res.json({ message: "Password reset. Give the owner their temporary password securely." });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/password  body: { email, newPassword }
exports.resetUserPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body || {};
    if (
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({ message: "Enter a valid account email" });
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({ message: "Temporary password must be at least 6 characters" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() })
      .select("+passwordHash +tokenVersion");
    if (!user) return res.status(404).json({ message: "Account not found" });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    await writeAudit(req, {
      eventType: "user.password_reset",
      entityType: "user",
      entityId: user._id,
      details: { role: user.role },
    });
    revokeUserSockets(user._id);
    res.json({ message: "Password reset. Give the user their temporary password securely." });
  } catch (err) {
    next(err);
  }
};