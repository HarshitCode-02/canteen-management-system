const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
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
  createdAt: { type: Date, default: Date.now },
  readyAt: { type: Date },
});

orderSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model("Order", orderSchema);