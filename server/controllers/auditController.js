const mongoose = require("mongoose");
const AuditLog = require("../models/AuditLog");

const EVENT_TYPES = AuditLog.schema.path("eventType").enumValues;

exports.listAuditLogs = async (req, res, next) => {
  try {
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    if (!Number.isInteger(page) || page < 1 || page > 10000) {
      return res.status(400).json({ message: "page must be a positive integer" });
    }

    const filter = {};
    if (req.query.eventType !== undefined) {
      if (!EVENT_TYPES.includes(req.query.eventType)) {
        return res.status(400).json({ message: "Invalid audit event type" });
      }
      filter.eventType = req.query.eventType;
    }
    if (req.query.canteen !== undefined) {
      if (!mongoose.isValidObjectId(req.query.canteen)) {
        return res.status(400).json({ message: "Invalid canteen id" });
      }
      filter.canteen = req.query.canteen;
    }
    if (req.query.actor !== undefined) {
      if (!mongoose.isValidObjectId(req.query.actor)) {
        return res.status(400).json({ message: "Invalid actor id" });
      }
      filter.actor = req.query.actor;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("actor", "name")
        .populate("canteen", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * 25)
        .limit(25)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ page, total, logs });
  } catch (err) {
    next(err);
  }
};
