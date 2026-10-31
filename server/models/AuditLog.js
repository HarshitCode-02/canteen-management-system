const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    enum: [
      "order.created",
      "order.status_changed",
      "order.cancelled",
      "order.collected",
      "order.payment_confirmed",
      "order.no_show",
      "menu.created",
      "menu.updated",
      "menu.deleted",
      "canteen.created",
      "canteen.updated",
      "canteen.open_changed",
      "staff.created",
      "staff.canteens_changed",
      "user.unblocked",
      "user.blocked",
      "user.password_reset",
      "review.moderated",
    ],
  },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  actorRole: { type: String, enum: ["student", "teacher", "canteen", "admin", "system"], required: true },
  entityType: { type: String, enum: ["order", "menuItem", "canteen", "user", "review"], required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  canteen: { type: mongoose.Schema.Types.ObjectId, ref: "Canteen", default: null },
  requestId: { type: String, maxlength: 64 },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: true, updatedAt: false } });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ canteen: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
