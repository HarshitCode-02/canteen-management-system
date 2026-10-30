const mongoose = require("mongoose");
const Canteen = require("../models/Canteen");
const MenuItem = require("../models/MenuItem");
const { canManageCanteen } = require("../middleware/auth");
const { SLOT_MS, slotStart, countInSlot } = require("../slots");
const User = require("../models/User");
const Order = require("../models/Order");
const { emitToUser } = require("../socket");




const EDITABLE = ["name", "slug", "logo", "description", "location", "isOpen", "isActive", "slotLimit", "avgPrepMins"];

const pick = (body) =>
  EDITABLE.reduce((acc, f) => {
    if (body[f] !== undefined) acc[f] = body[f];
    return acc;
  }, {});

const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");


// rush = number of orders currently placed/preparing at the canteen
async function loadFor(canteenIds) {
  const rows = await Order.aggregate([
    { $match: { canteen: { $in: canteenIds }, status: { $in: ["placed", "preparing"] } } },
    { $group: { _id: "$canteen", n: { $sum: 1 } } },
  ]);
  const map = {};
  rows.forEach((r) => (map[String(r._id)] = r.n));
  return map;
}
const rushLevel = (n) => (n <= 2 ? "Quiet" : n <= 6 ? "Normal" : "Busy");
const waitMins = (c, n) => Math.max(5, Math.round((c.avgPrepMins + n * 2) / 5) * 5);


// GET /api/canteens  (public, active canteens only)
exports.getCanteens = async (req, res, next) => {
  try {
    const canteens = await Canteen.find({ isActive: true }).sort({ name: 1 });
    const load = await loadFor(canteens.map((c) => c._id));
    res.json(
      canteens.map((c) => {
        const n = load[String(c._id)] || 0;
        return { ...c.toObject(), rush: rushLevel(n), waitMins: waitMins(c, n) };
      })
    );
  } catch (err) {
    next(err);
  }
};

// GET /api/canteens/:id  (public)
exports.getCanteen = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid canteen id" });
    }
    const canteen = await Canteen.findOne({ _id: req.params.id, isActive: true });
    if (!canteen) return res.status(404).json({ message: "Canteen not found" });
    res.json(canteen);
  } catch (err) {
    next(err);
  }
};

// GET /api/canteens/:id/menu  (public) -> { canteen, items }
exports.getCanteenMenu = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid canteen id" });
    }
    const canteen = await Canteen.findOne({ _id: req.params.id, isActive: true });
    if (!canteen) return res.status(404).json({ message: "Canteen not found" });

    const found = await MenuItem.find({ canteen: canteen._id }).sort({ category: 1, name: 1 });

    // Popular = ordered 3+ times in the last 7 days, top 3 items
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const top = await Order.aggregate([
      { $match: { canteen: canteen._id, createdAt: { $gte: since }, status: { $ne: "cancelled" } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.menuItem", qty: { $sum: "$items.qty" } } },
      { $match: { qty: { $gte: 3 } } },
      { $sort: { qty: -1 } },
      { $limit: 3 },
    ]);
    const popular = new Set(top.map((t) => String(t._id)));
    const items = found.map((i) => ({ ...i.toObject(), isPopular: popular.has(String(i._id)) }));

    const n = (await loadFor([canteen._id]))[String(canteen._id)] || 0;
    res.json({
      canteen: { ...canteen.toObject(), rush: rushLevel(n), waitMins: waitMins(canteen, n) },
      items,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/canteens  (admin)
exports.createCanteen = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "name is required" });
    }
    const data = pick(req.body);
    data.slug = slugify(data.slug || name);
    if (!data.slug) return res.status(400).json({ message: "Could not create a valid slug" });

    const canteen = await Canteen.create(data);
    res.status(201).json(canteen);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "A canteen with this slug already exists" });
    if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
    next(err);
  }
};

// PATCH /api/canteens/:id  (admin)
exports.updateCanteen = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid canteen id" });
    }
    const data = pick(req.body);
    if (data.slug !== undefined) data.slug = slugify(data.slug);

    const canteen = await Canteen.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!canteen) return res.status(404).json({ message: "Canteen not found" });
    res.json(canteen);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "A canteen with this slug already exists" });
    if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
    next(err);
  }
};

// PATCH /api/canteens/:id/open  body: { isOpen: true|false }  (staff of that canteen, or admin)
exports.setOpen = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid canteen id" });
    }
    if (typeof req.body.isOpen !== "boolean") {
      return res.status(400).json({ message: "isOpen must be true or false" });
    }
    if (!canManageCanteen(req.user, id)) {
      return res.status(403).json({ message: "You cannot manage this canteen" });
    }
    const canteen = await Canteen.findByIdAndUpdate(id, { isOpen: req.body.isOpen }, { new: true });
    if (!canteen) return res.status(404).json({ message: "Canteen not found" });
    res.json(canteen);
  } catch (err) {
    next(err);
  }
};

// GET /api/canteens/:id/slots  (public)  next 12 ten-minute pickup slots and how full they are
exports.getSlots = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid canteen id" });
    }
    const canteen = await Canteen.findById(id);
    if (!canteen) return res.status(404).json({ message: "Canteen not found" });

    const first = slotStart(Date.now()).getTime() + SLOT_MS;
    const slots = await Promise.all(
      Array.from({ length: 12 }, async (_, i) => {
        const start = new Date(first + i * SLOT_MS);
        const used = await countInSlot(id, start);
        return {
          start: start.toISOString(),
          used,
          limit: canteen.slotLimit,
          full: used >= canteen.slotLimit,
        };
      })
    );
    res.json(slots);
  } catch (err) {
    next(err);
  }
};

// GET /api/canteens/:id/blocked  (staff of that canteen, or admin)
// Blocked students who have at least one no-show order at THIS canteen
exports.getBlockedUsers = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid canteen id" });
    }
    if (!canManageCanteen(req.user, id)) {
      return res.status(403).json({ message: "You cannot manage this canteen" });
    }

    const userIds = await Order.distinct("user", { canteen: id, status: "no_show" });
    const users = await User.find({ _id: { $in: userIds }, isBlocked: true })
      .select("name phone noShowCount blockedAt");
    const orders = await Order.find({
      canteen: id,
      status: "no_show",
      user: { $in: users.map((u) => u._id) },
    })
      .sort({ createdAt: -1 })
      .select("user orderNumber total pickupTime createdAt paymentStatus");

    res.json(
      users.map((u) => ({
        _id: u._id,
        name: u.name,
        phone: u.phone,
        noShowCount: u.noShowCount,
        blockedAt: u.blockedAt,
        noShowOrders: orders.filter((o) => String(o.user) === String(u._id)),
      }))
    );
  } catch (err) {
    next(err);
  }
};

// PATCH /api/canteens/:id/unblock/:userId  (staff of that canteen, or admin)
exports.unblockUser = async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid id" });
    }
    if (!canManageCanteen(req.user, id)) {
      return res.status(403).json({ message: "You cannot manage this canteen" });
    }
    const hadNoShow = await Order.exists({ canteen: id, user: userId, status: "no_show" });
    if (!hadNoShow) {
      return res.status(403).json({ message: "This student has no no-show at your canteen" });
    }
    const unpaidNoShow = await Order.exists({
      canteen: id,
      user: userId,
      status: "no_show",
      paymentStatus: { $ne: "paid" },
    });
    if (unpaidNoShow) {
      return res.status(409).json({
        message: "Confirm the counter payment for every no-show order at this canteen before unblocking the student",
      });
    }
    const user = await User.findOneAndUpdate(
      { _id: userId, isBlocked: true },
      { isBlocked: false, noShowCount: 0, $unset: { blockedAt: 1 } },
      { new: true }
    ).select("name");
    if (!user) return res.status(404).json({ message: "This student is not blocked" });

    emitToUser(userId, "accountUpdated", {}); // student's page refreshes at once

    res.json({ message: `${user.name} has been unblocked` });
  } catch (err) {
    next(err);
  }
};
