const mongoose = require("mongoose");
const MenuItem = require("../models/MenuItem");

const FIELDS = ["name", "price", "category", "image", "isAvailable", "prepTimeMins"];

const pick = (body) =>
  FIELDS.reduce((acc, f) => {
    if (body[f] !== undefined) acc[f] = body[f];
    return acc;
  }, {});

// GET /api/menu  (includes sold-out items; client greys them out)
exports.getMenu = async (req, res, next) => {
  try {
    const items = await MenuItem.find().sort({ category: 1, name: 1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
};

// POST /api/menu
exports.createItem = async (req, res, next) => {
  try {
    const { name, price, category } = req.body;
    if (!name || price === undefined || !category) {
      return res.status(400).json({ message: "name, price and category are required" });
    }
    const item = await MenuItem.create(pick(req.body));
    res.status(201).json(item);
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
    next(err);
  }
};

// PATCH /api/menu/:id
exports.updateItem = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid item id" });
    }
    const item = await MenuItem.findByIdAndUpdate(req.params.id, pick(req.body), {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ message: "Menu item not found" });
    res.json(item);
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
    next(err);
  }
};

// DELETE /api/menu/:id
exports.deleteItem = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid item id" });
    }
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Menu item not found" });
    res.json({ message: "Menu item deleted" });
  } catch (err) {
    next(err);
  }
};