const mongoose = require("mongoose");

const canteenSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  logo: { type: String, default: "" },
  description: { type: String, default: "", trim: true },
  location: { type: String, default: "", trim: true },
  isOpen: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  slotLimit: { type: Number, default: 10, min: 1 },
  avgPrepMins: { type: Number, default: 10, min: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Canteen", canteenSchema);