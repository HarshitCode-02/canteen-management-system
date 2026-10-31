const mongoose = require("mongoose");
const Order = require("../models/Order");
const MenuItem = require("../models/MenuItem");
const Counter = require("../models/Counter");
const User = require("../models/User");
const { canManageCanteen } = require("../middleware/auth");
const ACTIVE = ["placed", "preparing", "ready"];
const FINAL = ["collected", "cancelled", "no_show"];
const STATUSES = [...ACTIVE, ...FINAL];
const Canteen = require("../models/Canteen");
const crypto = require("crypto");
const { notifyOrder } = require("../socket");
const { countInSlot } = require("../slots");
const { markNoShow } = require("../noShow");

const MAX_ORDER_LINES = 20;
const MAX_ITEM_QUANTITY = 20;

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

const nextOrderNumber = async (canteenId, session) => {
  const counter = await Counter.findOneAndUpdate(
    { _id: `${canteenId}:${todayKey()}` },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after", session }
  );
  return `A${counter.seq}`;
};

class OrderRequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// POST /api/orders
exports.createOrder = async (req, res, next) => {
  try {
    const { items, pickupTime, note } = req.body || {};

    if (note !== undefined && typeof note !== "string") {
      return res.status(400).json({ message: "note must be text" });
    }
    const cleanNote = (note || "").trim();
    if (cleanNote.length > 100) {
      return res.status(400).json({ message: "Note can be at most 100 characters" });
    }

    if (req.user.isBlocked) {
      return res.status(403).json({ message: "You are blocked because of a no-show. Pay the full no-show order amount at the canteen counter and ask staff to record the payment and unblock you." });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items must be a non-empty array" });
    }
    if (items.length > MAX_ORDER_LINES) {
      return res.status(400).json({ message: `An order can contain at most ${MAX_ORDER_LINES} item lines` });
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
      if (!it || typeof it !== "object" || Array.isArray(it)) {
        return res.status(400).json({ message: "Each item must include a valid menuItemId and quantity" });
      }
      const qty = Number(it.qty);
      if (!mongoose.isValidObjectId(it.menuItemId) || !Number.isInteger(qty) || qty < 1 || qty > MAX_ITEM_QUANTITY) {
        return res.status(400).json({ message: `Each item needs a valid menuItemId and qty between 1 and ${MAX_ITEM_QUANTITY}` });
      }
      const key = String(it.menuItemId);
      const mergedQty = (wanted.get(key) || 0) + qty;
      if (mergedQty > MAX_ITEM_QUANTITY) {
        return res.status(400).json({ message: `Combined quantity for an item cannot exceed ${MAX_ITEM_QUANTITY}` });
      }
      wanted.set(key, mergedQty);
    }

    let order;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // These transactional writes serialize competing orders for this user and canteen.
        const user = await User.findOneAndUpdate(
          { _id: req.user._id, isBlocked: { $ne: true } },
          { $inc: { orderLockVersion: 1 } },
          { new: true, session }
        );
        if (!user) {
          throw new OrderRequestError(
            403,
            "You are blocked because of a no-show. Pay the full no-show order amount at the canteen counter and ask staff to record the payment and unblock you."
          );
        }

        const active = await Order.findOne({
          user: req.user._id,
          status: { $in: ACTIVE },
        }).session(session);
        if (active) {
          throw new OrderRequestError(409, `You already have an active order (${active.orderNumber})`);
        }

        const menuItems = await MenuItem.find({ _id: { $in: [...wanted.keys()] } }).session(session);
        if (menuItems.length !== wanted.size) {
          throw new OrderRequestError(400, "One or more menu items were not found");
        }
        const soldOut = menuItems.filter((item) => !item.isAvailable);
        if (soldOut.length > 0) {
          throw new OrderRequestError(400, `Sold out: ${soldOut.map((item) => item.name).join(", ")}`);
        }
        const canteenIds = new Set(menuItems.map((item) => String(item.canteen)));
        if (!menuItems[0].canteen || canteenIds.size !== 1) {
          throw new OrderRequestError(400, "All items must be from the same canteen");
        }
        const canteenId = menuItems[0].canteen;

        const canteen = await Canteen.findOneAndUpdate(
          { _id: canteenId, isActive: true, isOpen: true },
          { $inc: { orderLockVersion: 1 } },
          { new: true, session }
        );
        if (!canteen) {
          const current = await Canteen.findById(canteenId).session(session);
          if (!current || !current.isActive) throw new OrderRequestError(400, "This canteen is not available");
          throw new OrderRequestError(400, `${current.name} is closed right now`);
        }

        const used = await countInSlot(canteenId, pickup, session);
        if (used >= canteen.slotLimit) {
          throw new OrderRequestError(409, "That pickup slot is full. Please choose another time.");
        }

        const orderItems = menuItems.map((item) => ({
          menuItem: item._id,
          name: item.name,
          price: item.price,
          qty: wanted.get(String(item._id)),
        }));
        const total = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);
        order = new Order({
          canteen: canteenId,
          orderNumber: await nextOrderNumber(canteenId, session),
          user: req.user._id,
          items: orderItems,
          total,
          pickupTime: pickup,
          note: cleanNote,
          pickupCode: makePickupCode(),
        });
        await order.save({ session });
      });
    } finally {
      await session.endSession();
    }

    notifyOrder(order, "newOrder");
    res.status(201).json(order);
  } catch (err) {
    if (err instanceof OrderRequestError) {
      return res.status(err.status).json({ message: err.message });
    }
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
      .limit(50)
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

// GET /api/orders/report?canteen=<id>&days=1|7|30 (canteen/admin)
exports.getSalesReport = async (req, res, next) => {
  try {
    const { canteen: canteenId, days: rawDays } = req.query;
    const days = Number(rawDays);
    if (!mongoose.isValidObjectId(canteenId)) {
      return res.status(400).json({ message: "A valid canteen id is required" });
    }
    if (![1, 7, 30].includes(days) || String(days) !== String(rawDays)) {
      return res.status(400).json({ message: "days must be 1, 7 or 30" });
    }
    if (!canManageCanteen(req.user, canteenId)) {
      return res.status(403).json({ message: "You cannot view this canteen's report" });
    }

    const todayInIndia = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const start = new Date(`${todayInIndia}T00:00:00+05:30`);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    const period = {
      canteen: new mongoose.Types.ObjectId(canteenId),
      createdAt: { $gte: start, $lte: new Date() },
    };

    const [summaryRows, best, hours] = await Promise.all([
      Order.aggregate([
        { $match: period },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$total", 0] },
            },
            unpaid: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $in: ["$status", ["collected", "no_show"]] },
                      { $eq: ["$paymentStatus", "pending"] },
                    ],
                  },
                  "$total",
                  0,
                ],
              },
            },
            cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
            noShows: { $sum: { $cond: [{ $eq: ["$status", "no_show"] }, 1, 0] } },
          },
        },
        { $project: { _id: 0, orders: 1, revenue: 1, unpaid: 1, cancelled: 1, noShows: 1 } },
      ]),
      Order.aggregate([
        { $match: { ...period, status: "collected" } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.name",
            qty: { $sum: "$items.qty" },
            revenue: { $sum: { $multiply: ["$items.price", "$items.qty"] } },
          },
        },
        { $sort: { revenue: -1, qty: -1, _id: 1 } },
        { $limit: 5 },
        { $project: { _id: 0, name: "$_id", qty: 1, revenue: 1 } },
      ]),
      Order.aggregate([
        { $match: period },
        {
          $group: {
            _id: { $hour: { date: "$pickupTime", timezone: "Asia/Kolkata" } },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, hour: "$_id", orders: 1 } },
      ]),
    ]);

    res.json({
      days,
      ...(summaryRows[0] || { orders: 0, revenue: 0, unpaid: 0, cancelled: 0, noShows: 0 }),
      best,
      hours,
    });
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

    if (status === "no_show") {
      const done = await markNoShow(order._id);
      if (!done) {
        return res.status(400).json({ message: "This order is no longer ready" });
      }
      return res.json(done);
    }

    order.status = status;
    if (status === "ready") order.readyAt = new Date();
    await order.save();
    notifyOrder(order);

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
    notifyOrder(order);
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
    notifyOrder(order);
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
    if (!["ready", "collected", "no_show"].includes(order.status)) {
      return res.status(400).json({ message: "Payment can only be confirmed for ready, collected, or no-show orders" });
    }

    order.paymentStatus = "paid";
    await order.save();
    notifyOrder(order);
    res.json(order);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/orders/:id/late  (order owner, only while ready, only once)
exports.runningLate = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    // one atomic update: owner + ready + not used yet
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, status: "ready", lateExtended: { $ne: true } },
      { lateExtended: true },
      { new: true }
    );

    if (!order) {
      const existing = await Order.findOne({ _id: req.params.id, user: req.user._id }).select("status lateExtended");
      if (!existing) return res.status(404).json({ message: "Order not found" });
      if (existing.status !== "ready") {
        return res.status(400).json({ message: "You can ask for extra time only once your order is ready" });
      }
      return res.status(400).json({ message: "You have already used your extra time" });
    }

    notifyOrder(order);
    res.json(order);
  } catch (err) {
    next(err);
  }
};
