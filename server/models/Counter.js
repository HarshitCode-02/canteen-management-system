const mongoose = require("mongoose");

// One document per day, e.g. { _id: "2026-10-28", seq: 7 }
const counterSchema = new mongoose.Schema({
  _id: { type: String },
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model("Counter", counterSchema);