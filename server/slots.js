const Order = require("./models/Order");

const SLOT_MS = 10 * 60 * 1000; // 10-minute slots
const ACTIVE = ["placed", "preparing", "ready"];

// start of the 10-minute slot that contains this time
const slotStart = (date) =>
  new Date(Math.floor(new Date(date).getTime() / SLOT_MS) * SLOT_MS);

// how many active orders already use that slot in this canteen
const countInSlot = (canteenId, date) => {
  const start = slotStart(date);
  return Order.countDocuments({
    canteen: canteenId,
    status: { $in: ACTIVE },
    pickupTime: { $gte: start, $lt: new Date(start.getTime() + SLOT_MS) },
  });
};

module.exports = { SLOT_MS, slotStart, countInSlot };