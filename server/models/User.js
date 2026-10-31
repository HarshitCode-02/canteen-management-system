const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  rollNumber: { type: String, trim: true },
  department: { type: String, trim: true },
  year: { type: Number, min: 1, max: 6 },
  avatarUrl: { type: String, trim: true },
  passwordHash: { type: String, required: true, select: false },
  tokenVersion: { type: Number, default: 0, select: false },
  orderLockVersion: { type: Number, default: 0, select: false },
  role: { type: String, enum: ["student", "teacher", "canteen", "admin"], default: "student" },
  // canteens this staff member may manage (admin can manage all)
  managedCanteens: [{ type: mongoose.Schema.Types.ObjectId, ref: "Canteen" }],
  noShowCount: { type: Number, default: 0 },
  isBlocked: { type: Boolean, default: false },
  blockedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

// never leak passwordHash in JSON responses
userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.tokenVersion;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);