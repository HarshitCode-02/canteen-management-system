const mongoose = require("mongoose");

const noShowReviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  canteen: { type: mongoose.Schema.Types.ObjectId, ref: "Canteen", required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  explanation: { type: String, required: true, trim: true, maxlength: 500 },
  decision: {
    type: String,
    enum: ["kept_blocked", "unblocked", "order_corrected"],
    required: true,
  },
  correctedStatus: { type: String, enum: ["collected", "cancelled"] },
}, { timestamps: { createdAt: true, updatedAt: false } });

noShowReviewSchema.index({ user: 1, createdAt: -1 });
noShowReviewSchema.index({ canteen: 1, createdAt: -1 });

module.exports = mongoose.model("NoShowReview", noShowReviewSchema);
