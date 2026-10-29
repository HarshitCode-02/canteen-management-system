const mongoose = require("mongoose");
const Order = require("../models/Order");
const MenuItem = require("../models/MenuItem");
const Counter = require("../models/Counter");
const { canManageCanteen } = require("../middleware/auth");
const ACTIVE = ["placed", "preparing", "ready"];
const FINAL = ["collected", "cancelled", "no_show"];
const STATUSES = [...ACTIVE, ...FINAL];
const Canteen = require("../models/Canteen");
const crypto = require("crypto");


// Counter key is today's date in India time, so numbers reset at midnight IST
const todayKey = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

// 4-digit code, e.g. "0427". crypto.randomInt is secure, unlike Math.random.
const makePickupCode = () => String(crypto.randomInt(0, 10000)).padStart(4, "0");
const MAX_CODE_ATTEMPTS = 5;

// allowed status changes through updateStatus ("collected" goes through the code check)
const ALLOWED = {
  placed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["no_show"],
};

// never send the code or attempt counter to staff
const publicOrder = (order) => {
  const obj = order.toObject();
  delete obj.pickupCode;
  delete obj.codeAttempts;
  return obj;
};

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

    const canteen = await Canteen.findOne({ _id: canteenId, isActive: true });
    if (!canteen) {
      return res.status(400).json({ message: "This canteen is not available" });
    }

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
      pickupCode: makePickupCode(),
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
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select("+pickupCode")
      .populate("canteen", "name");

    const result = orders.map((o) => {
      const obj = o.toObject();
      if (!ACTIVE.includes(o.status)) delete obj.pickupCode;
      return obj;
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// GET /api/orders  (canteen/admin)  optional ?canteen=<id>
// Staff: only their canteens. Admin: all, or one with ?canteen=
exports.getActiveOrders = async (req, res, next) => {
  try {
    // active orders, plus collected orders still waiting for payment
    const filter = {
      $or: [{ status: { $in: ACTIVE } }, { status: "collected", paymentStatus: "pending" }],
    };
    const requested = req.query.canteen;

    if (requested !== undefined) {
      if (!mongoose.isValidObjectId(requested)) {
        return res.status(400).json({ message: "Invalid canteen id" });
      }
      if (!canManageCanteen(req.user, requested)) {
        return res.status(403).json({ message: "You cannot manage this canteen" });
      }
      filter.canteen = requested;
    } else if (req.user.role !== "admin") {
      filter.canteen = { $in: req.user.managedCanteens };
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: 1 })
      .populate("user", "name phone")
      .populate("canteen", "name");
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/orders/:id/status  (staff of that canteen, or admin)
exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${STATUSES.join(", ")}` });
    }
    if (status === "collected") {
      return res.status(400).json({ message: "Enter the pickup code to collect an order" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!canManageCanteen(req.user, order.canteen)) {
      return res.status(403).json({ message: "This order belongs to another canteen" });
    }
    if (!(ALLOWED[order.status] || []).includes(status)) {
      return res.status(400).json({ message: `Cannot change an order from ${order.status} to ${status}` });
    }

    order.status = status;
    if (status === "ready") order.readyAt = new Date();
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

// PATCH /api/orders/:id/verify  body: { code, paid? }  (staff of that canteen, or admin)
exports.verifyAndCollect = async (req, res, next) => {
  try {
    const { code, paid } = req.body;
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }
    const order = await Order.findById(req.params.id).select("+pickupCode +codeAttempts");
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!canManageCanteen(req.user, order.canteen)) {
      return res.status(403).json({ message: "This order belongs to another canteen" });
    }
    if (order.status !== "ready") {
      return res.status(400).json({ message: "Only ready orders can be collected" });
    }

    // orders placed before pickup codes existed have no code, so skip the check
    if (order.pickupCode) {
      const attempts = order.codeAttempts || 0;
      if (attempts >= MAX_CODE_ATTEMPTS) {
        return res.status(429).json({
          message: "Too many wrong codes for this order. Mark it as no-show or call the student.",
        });
      }
      if (String(code || "").trim() !== order.pickupCode) {
        order.codeAttempts = attempts + 1;
        await order.save();
        const left = MAX_CODE_ATTEMPTS - order.codeAttempts;
        return res.status(400).json({
          message: left > 0 ? `Wrong code. ${left} attempts left.` : "Wrong code. No attempts left.",
        });
      }
    }

    order.status = "collected";
    if (paid === true) order.paymentStatus = "paid"; // only when staff say so
    await order.save();
    res.json(publicOrder(order));
  } catch (err) {
    next(err);
  }
};

// PATCH /api/orders/:id/payment  (staff of that canteen, or admin)
exports.confirmPayment = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!canManageCanteen(req.user, order.canteen)) {
      return res.status(403).json({ message: "This order belongs to another canteen" });
    }
    if (!["ready", "collected"].includes(order.status)) {
      return res.status(400).json({ message: "Payment can only be confirmed for ready or collected orders" });
    }

    order.paymentStatus = "paid";
    await order.save();
    res.json(order);
  } catch (err) {
    next(err);
  }
};
