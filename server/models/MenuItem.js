const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema({
  canteen: { type: mongoose.Schema.Types.ObjectId, ref: "Canteen", index: true, required: true },
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true, trim: true },
  image: { type: String, default: "", trim: true, maxlength: 2048 },
  isAvailable: { type: Boolean, default: true },
  isSpecial: { type: Boolean, default: false },
  prepTimeMins: { type: Number, default: 10, min: 0 },
});

module.exports = mongoose.model("MenuItem", menuItemSchema);