const cron = require("node-cron");
const mongoose = require("mongoose");
const Order = require("./models/Order");
const User = require("./models/User");
const { notifyOrder, emitToUser } = require("./socket");
const { writeAudit } = require("./services/auditLog");

const NO_SHOW_AFTER_MINS = 20;
const LATE_EXTRA_MINS = 10; // one-time extra time from "I'm running late"
const MAX_STRIKES = 1;

// Only an order still marked ready after its pickup grace period can become a no-show.
// The conditional update makes the timer and staff action count the order once.
// The status filter makes it safe if the button and the timer fire together:
// only one of them can change the order, so the strike is counted once.
// extraFilter lets the timer re-check "is it still overdue?" in the same update.
async function markNoShow(orderId, extraFilter = {}, req) {
  const session = await mongoose.startSession();
  let order;
  let blockedUser;
  try {
    await session.withTransaction(async () => {
      order = await Order.findOneAndUpdate(
        { _id: orderId, status: "ready", ...extraFilter },
        {
          $set: { status: "no_show", noShowAt: new Date() },
          $unset: { pickupQrHash: 1, pickupQrExpiresAt: 1 },
        },
        { new: true, session }
      );
      if (!order) return;

      const user = await User.findByIdAndUpdate(
        order.user,
        { $inc: { noShowCount: 1 } },
        { new: true, session }
      );
      if (user && user.noShowCount >= MAX_STRIKES && !user.isBlocked) {
        user.isBlocked = true;
        user.blockedAt = new Date();
        await user.save({ session });
        blockedUser = user;
      }
      await writeAudit(req, {
        eventType: "order.no_show",
        entityType: "order",
        entityId: order._id,
        canteen: order.canteen,
        details: { fromStatus: "ready", toStatus: "no_show" },
      }, session);
      if (blockedUser) {
        await writeAudit(req, {
          eventType: "user.blocked",
          entityType: "user",
          entityId: blockedUser._id,
          canteen: order.canteen,
          details: { role: blockedUser.role },
        }, session);
      }
    });
  } finally {
    await session.endSession();
  }
  if (order) {
    notifyOrder(order);
    if (blockedUser) emitToUser(order.user, "accountUpdated", { isBlocked: true });
  }
  return order;
}

async function runNoShowCheck() {
  const now = Date.now();
  const cutoff = new Date(now - NO_SHOW_AFTER_MINS * 60 * 1000);
  const lateCutoff = new Date(now - (NO_SHOW_AFTER_MINS + LATE_EXTRA_MINS) * 60 * 1000);

  const due = {
    $or: [
      { lateExtended: { $ne: true }, readyAt: { $lt: cutoff } },
      { lateExtended: true, readyAt: { $lt: lateCutoff } },
    ],
  };

  const late = await Order.find({ status: "ready", ...due }).select("_id");
  for (const o of late) {
    try {
      await markNoShow(o._id, due);
    } catch (err) {
      console.error("No-show job error", { errorName: err.name || "Error" });
    }
  }
}

function startNoShowJob() {
  cron.schedule("* * * * *", runNoShowCheck); // every minute
  console.log("No-show job started");
}

module.exports = { markNoShow, runNoShowCheck, startNoShowJob };