const mongoose = require("mongoose");
const Order = require("../models/Order");
const MenuItem = require("../models/MenuItem");
const Review = require("../models/Review");
const { writeAudit } = require("../services/auditLog");

exports.createReview = async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!mongoose.isValidObjectId(body.orderId) || !mongoose.isValidObjectId(body.menuItemId)) {
      return res.status(400).json({ message: "A valid orderId and menuItemId are required" });
    }
    if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
      return res.status(400).json({ message: "rating must be an integer from 1 to 5" });
    }
    if (body.text !== undefined && typeof body.text !== "string") {
      return res.status(400).json({ message: "Review text must be text" });
    }
    const text = (body.text || "").trim();
    if (text.length > 500) {
      return res.status(400).json({ message: "Review text must be 500 characters or fewer" });
    }

    const order = await Order.findOne({
      _id: body.orderId,
      user: req.user._id,
      status: "collected",
    }).select("items");
    if (!order) return res.status(404).json({ message: "Collected order not found" });
    const included = order.items.some((item) => String(item.menuItem) === String(body.menuItemId));
    if (!included) {
      return res.status(403).json({ message: "This item was not included in your order" });
    }
    if (!(await MenuItem.exists({ _id: body.menuItemId }))) {
      return res.status(404).json({ message: "This menu item is no longer available for reviews" });
    }

    const review = await Review.create({
      user: req.user._id,
      order: order._id,
      menuItem: body.menuItemId,
      rating: body.rating,
      text,
    });
    res.status(201).json(review);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "You already reviewed this item for this order" });
    if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
    next(err);
  }
};

exports.getMenuItemReviews = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.menuItemId)) {
      return res.status(400).json({ message: "Invalid menu item id" });
    }
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    if (!Number.isInteger(page) || page < 1 || page > 10000) {
      return res.status(400).json({ message: "page must be a positive integer" });
    }
    const filter = { menuItem: req.params.menuItemId, isVisible: true };
    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .select("rating text createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * 20)
        .limit(20),
      Review.countDocuments(filter),
    ]);
    res.json({ page, total, reviews });
  } catch (err) {
    next(err);
  }
};

exports.getMyReviews = async (req, res, next) => {
  try {
    let orderIds;
    if (req.query.orders !== undefined) {
      if (typeof req.query.orders !== "string" || req.query.orders.length > 3000) {
        return res.status(400).json({ message: "Invalid order list" });
      }
      orderIds = req.query.orders.split(",").filter(Boolean);
      if (orderIds.length > 50 || !orderIds.every((id) => mongoose.isValidObjectId(id))) {
        return res.status(400).json({ message: "orders must contain at most 50 valid order ids" });
      }
      if (orderIds.length === 0) return res.json({ reviews: [] });
    }

    const filter = { user: req.user._id };
    if (orderIds) filter.order = { $in: orderIds };
    const reviews = await Review.find(filter)
      .select("order menuItem rating text")
      .sort({ createdAt: -1 })
      .limit(orderIds ? 1000 : 100);
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
};

exports.listAdminReviews = async (req, res, next) => {
  try {
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const visibility = req.query.visibility || "visible";
    if (!Number.isInteger(page) || page < 1 || page > 10000) {
      return res.status(400).json({ message: "page must be a positive integer" });
    }
    if (!["visible", "hidden", "all"].includes(visibility)) {
      return res.status(400).json({ message: "visibility must be visible, hidden, or all" });
    }
    const filter = visibility === "all" ? {} : { isVisible: visibility === "visible" };
    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("user", "name")
        .populate("menuItem", "name")
        .populate("order", "orderNumber")
        .sort({ createdAt: -1 })
        .skip((page - 1) * 25)
        .limit(25),
      Review.countDocuments(filter),
    ]);
    res.json({ page, total, reviews });
  } catch (err) {
    next(err);
  }
};

exports.moderateReview = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid review id" });
    }
    if (typeof req.body?.isVisible !== "boolean") {
      return res.status(400).json({ message: "isVisible must be true or false" });
    }
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { $set: { isVisible: req.body.isVisible, updatedAt: new Date() } },
      { new: true, runValidators: true }
    );
    if (!review) return res.status(404).json({ message: "Review not found" });
    await writeAudit(req, {
      eventType: "review.moderated",
      entityType: "review",
      entityId: review._id,
      details: { isVisible: review.isVisible },
    });
    res.json(review);
  } catch (err) {
    next(err);
  }
};
