const cron = require("node-cron");
const Order = require("./models/Order");
const User = require("./models/User");
const { notifyOrder } = require("./socket");

const NO_SHOW_AFTER_MINS = 20;
const MAX_STRIKES = 1;

// The one rule: ready order -> no_show, +1 strike, block at MAX_STRIKES.
// The status filter makes it safe if the button and the timer fire together:
// only one of them can change the order, so the strike is counted once.
async function markNoShow(orderId) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: "ready" },
    { status: "no_show" },
    { new: true }
  );
  if (!order) return null;

  const user = await User.findByIdAndUpdate(
    order.user,
    { $inc: { noShowCount: 1 } },
    { new: true }
  );
  if (user && user.noShowCount >= MAX_STRIKES && !user.isBlocked) {
    user.isBlocked = true;
    user.blockedAt = new Date();
    await user.save();
  }
  notifyOrder(order);
  return order;
}

async function runNoShowCheck() {
  const cutoff = new Date(Date.now() - NO_SHOW_AFTER_MINS * 60 * 1000);
  const late = await Order.find({ status: "ready", readyAt: { $lt: cutoff } }).select("_id");
  for (const o of late) {
    try {
      await markNoShow(o._id);
    } catch (err) {
      console.error("No-show job error:", err.message);
    }
  }
}

function startNoShowJob() {
  cron.schedule("* * * * *", runNoShowCheck); // every minute
  console.log("No-show job started");
}

module.exports = { markNoShow, startNoShowJob };