const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  canteen: { type: mongoose.Schema.Types.ObjectId, ref: "Canteen", required: true },
  orderNumber: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [
    {
      _id: false,
      menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      qty: { type: Number, required: true, min: 1 },
    },
  ],
  total: { type: Number, required: true },
  pickupTime: { type: Date, required: true },
  status: {
    type: String,
    enum: ["placed", "preparing", "ready", "collected", "cancelled", "no_show"],
    default: "placed",
  },
  paymentStatus: { type: String, enum: ["pending", "paid"], default: "pending" },
  // generated on Day 8; never returned unless explicitly selected
  pickupCode: { type: String, select: false },
  codeAttempts: { type: Number, default: 0, select: false },
  createdAt: { type: Date, default: Date.now },
  readyAt: { type: Date },
    lateExtended: { type: Boolean, default: false },
});

orderSchema.index({ user: 1, status: 1 });
orderSchema.index({ canteen: 1, status: 1 });

module.exports = mongoose.model("Order", orderSchema);