const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["student", "teacher", "canteen", "admin"], default: "student" },
  // canteens this staff member may manage (admin can manage all)
  managedCanteens: [{ type: mongoose.Schema.Types.ObjectId, ref: "Canteen" }],
  noShowCount: { type: Number, default: 0 },
  isBlocked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// never leak passwordHash in JSON responses
userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);