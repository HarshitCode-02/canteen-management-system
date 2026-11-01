const mongoose = require("mongoose");
const MenuItem = require("../models/MenuItem");
const Canteen = require("../models/Canteen");
const { canManageCanteen } = require("../middleware/auth");
const { loadVisibleRatings } = require("../services/reviewRatings");
const { writeAudit } = require("../services/auditLog");

const FIELDS = ["name", "price", "category", "image", "isAvailable","isSpecial", "prepTimeMins"];

const pick = (body) =>
  FIELDS.reduce((acc, f) => {
    if (body[f] !== undefined) acc[f] = body[f];
    return acc;
  }, {});

// GET /api/menu  (optional ?canteen=<id>; without it, returns all, for now)
exports.getMenu = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.canteen !== undefined) {
      if (!mongoose.isValidObjectId(req.query.canteen)) {
        return res.status(400).json({ message: "Invalid canteen id" });
      }
      filter.canteen = req.query.canteen;
    }
    const items = await MenuItem.find(filter).sort({ category: 1, name: 1 });
    const ratings = await loadVisibleRatings(items.map((item) => item._id));
    res.json(items.map((item) => ({
      ...item.toObject(),
      rating: ratings.get(String(item._id)) || { average: null, count: 0 },
    })));
  } catch (err) {
    next(err);
  }
};

// POST /api/menu
// Staff with exactly one canteen: canteen defaults to it. Admin must send "canteen".
exports.createItem = async (req, res, next) => {
  try {
    const { name, price, category } = req.body;
    if (!name || price === undefined || !category) {
      return res.status(400).json({ message: "name, price and category are required" });
    }

    let canteenId = req.body.canteen;
    if (!canteenId && req.user.role === "canteen" && req.user.managedCanteens.length === 1) {
      canteenId = req.user.managedCanteens[0];
    }
    if (!canteenId) {
      return res.status(400).json({ message: "canteen is required" });
    }
    if (!mongoose.isValidObjectId(canteenId)) {
      return res.status(400).json({ message: "Invalid canteen id" });
    }
    if (!canManageCanteen(req.user, canteenId)) {
      return res.status(403).json({ message: "You cannot manage this canteen" });
    }
    if (!(await Canteen.exists({ _id: canteenId }))) {
      return res.status(404).json({ message: "Canteen not found" });
    }

    const item = await MenuItem.create({ ...pick(req.body), canteen: canteenId });
    await writeAudit(req, {
      eventType: "menu.created",
      entityType: "menuItem",
      entityId: item._id,
      canteen: item.canteen,
      details: { priceAfter: item.price, isAvailable: item.isAvailable },
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/menu/:id  (staff: own canteen only; admin: any)
exports.updateItem = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid item id" });
    }
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Menu item not found" });
    if (!canManageCanteen(req.user, item.canteen)) {
      return res.status(403).json({ message: "You cannot manage this canteen" });
    }

    const previousPrice = item.price;
    Object.assign(item, pick(req.body)); // pick() never includes "canteen"
    await item.save();
    await writeAudit(req, {
      eventType: "menu.updated",
      entityType: "menuItem",
      entityId: item._id,
      canteen: item.canteen,
      details: { priceBefore: previousPrice, priceAfter: item.price, isAvailable: item.isAvailable },
    });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/menu/:id  (staff: own canteen only; admin: any)
exports.deleteItem = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid item id" });
    }
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Menu item not found" });
    if (!canManageCanteen(req.user, item.canteen)) {
      return res.status(403).json({ message: "You cannot manage this canteen" });
    }

    await item.deleteOne();
    await writeAudit(req, {
      eventType: "menu.deleted",
      entityType: "menuItem",
      entityId: item._id,
      canteen: item.canteen,
    });
    res.json({ message: "Menu item deleted" });
  } catch (err) {
    next(err);
  }
};