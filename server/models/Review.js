const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
  rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
  text: { type: String, default: "", trim: true, maxlength: 500 },
  isVisible: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

reviewSchema.index({ user: 1, order: 1, menuItem: 1 }, { unique: true });
reviewSchema.index({ menuItem: 1, isVisible: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
