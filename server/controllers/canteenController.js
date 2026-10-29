const mongoose = require("mongoose");
const Canteen = require("../models/Canteen");
const MenuItem = require("../models/MenuItem");

const EDITABLE = ["name", "slug", "logo", "description", "location", "isOpen", "isActive", "slotLimit", "avgPrepMins"];

const pick = (body) =>
  EDITABLE.reduce((acc, f) => {
    if (body[f] !== undefined) acc[f] = body[f];
    return acc;
  }, {});

const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// GET /api/canteens  (public, active canteens only)
exports.getCanteens = async (req, res, next) => {
  try {
    const canteens = await Canteen.find({ isActive: true }).sort({ name: 1 });
    res.json(canteens);
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

    const items = await MenuItem.find({ canteen: canteen._id }).sort({ category: 1, name: 1 });
    res.json({ canteen, items });
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