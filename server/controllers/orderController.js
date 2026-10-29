const mongoose = require("mongoose");
const Order = require("../models/Order");
const MenuItem = require("../models/MenuItem");
const Counter = require("../models/Counter");

const ACTIVE = ["placed", "preparing", "ready"];
const FINAL = ["collected", "cancelled", "no_show"];
const STATUSES = [...ACTIVE, ...FINAL];

// Counter key is today's date in India time, so numbers reset at midnight IST
const todayKey = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const nextOrderNumber = async (canteenId) => {
  const counter = await Counter.findOneAndUpdate(
    { _id: `${canteenId}:${todayKey()}` },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return `A${counter.seq}`;
};

// POST /api/orders
exports.createOrder = async (req, res, next) => {
  try {
    const { items, pickupTime } = req.body;

    if (req.user.isBlocked) {
      return res.status(403).json({ message: "Your account is blocked. Please contact the canteen." });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items must be a non-empty array" });
    }
    if (!pickupTime) {
      return res.status(400).json({ message: "pickupTime is required" });
    }
    const pickup = new Date(pickupTime);
    if (isNaN(pickup.getTime())) {
      return res.status(400).json({ message: "pickupTime is not a valid date" });
    }
    if (pickup.getTime() < Date.now() - 5 * 60 * 1000) {
      return res.status(400).json({ message: "pickupTime cannot be in the past" });
    }

    // merge duplicate items and validate qty
    const wanted = new Map();
    for (const it of items) {
      const qty = Number(it.qty);
      if (!mongoose.isValidObjectId(it.menuItemId) || !Number.isInteger(qty) || qty < 1 || qty > 20) {
        return res.status(400).json({ message: "Each item needs a valid menuItemId and qty between 1 and 20" });
      }
      const key = String(it.menuItemId);
      wanted.set(key, (wanted.get(key) || 0) + qty);
    }

    const active = await Order.findOne({ user: req.user._id, status: { $in: ACTIVE } });
    if (active) {
      return res.status(409).json({ message: `You already have an active order (${active.orderNumber})` });
    }

    const menuItems = await MenuItem.find({ _id: { $in: [...wanted.keys()] } });
    if (menuItems.length !== wanted.size) {
      return res.status(400).json({ message: "One or more menu items were not found" });
    }
    const soldOut = menuItems.filter((m) => !m.isAvailable);
    if (soldOut.length > 0) {
      return res.status(400).json({ message: `Sold out: ${soldOut.map((m) => m.name).join(", ")}` });
    }
    // all items must belong to exactly one canteen
    const canteenIds = new Set(menuItems.map((m) => String(m.canteen)));
    if (!menuItems[0].canteen || canteenIds.size !== 1) {
      return res.status(400).json({ message: "All items must be from the same canteen" });
    }
    const canteenId = menuItems[0].canteen;

    // prices come from the DB, never from the client
    const orderItems = menuItems.map((m) => ({
      menuItem: m._id,
      name: m.name,
      price: m.price,
      qty: wanted.get(String(m._id)),
    }));
    const total = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0);

    const order = await Order.create({
      canteen: canteenId,
      orderNumber: await nextOrderNumber(canteenId),
      user: req.user._id,
      items: orderItems,
      total,
      pickupTime: pickup,
    });

    res.status(201).json(order);
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
    next(err);
  }
};

// GET /api/orders/my
exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

// GET /api/orders  (canteen/admin)
exports.getActiveOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ status: { $in: ACTIVE } })
      .sort({ createdAt: 1 })
      .populate("user", "name phone");
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/orders/:id/status  (canteen/admin)
exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${STATUSES.join(", ")}` });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (FINAL.includes(order.status)) {
      return res.status(400).json({ message: `Order is already ${order.status}` });
    }

    order.status = status;
    if (status === "ready") order.readyAt = new Date();
    if (status === "collected") order.paymentStatus = "paid";
    await order.save();

    res.json(order);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/orders/:id/cancel  (owner only, only while "placed")
exports.cancelOrder = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!order.user.equals(req.user._id)) {
      return res.status(403).json({ message: "This is not your order" });
    }
    if (order.status !== "placed") {
      return res.status(400).json({ message: "Only orders that are still 'placed' can be cancelled" });
    }

    order.status = "cancelled";
    await order.save();
    res.json(order);
  } catch (err) {
    next(err);
  }
};