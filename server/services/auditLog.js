const AuditLog = require("../models/AuditLog");

const SAFE_DETAILS = new Set([
  "fromStatus",
  "toStatus",
  "paymentStatus",
  "priceBefore",
  "priceAfter",
  "isAvailable",
  "isOpen",
  "isActive",
  "role",
  "canteenCount",
  "isVisible",
]);

const cleanDetails = (details = {}) =>
  Object.fromEntries(
    Object.entries(details).filter(([key, value]) =>
      SAFE_DETAILS.has(key)
      && (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))
        || (typeof value === "string" && value.length <= 80))
    )
  );

async function writeAudit(req, entry, session) {
  const actor = req?.user;
  const record = {
    ...entry,
    actor: actor?._id || null,
    actorRole: actor?.role || "system",
    requestId: req?.requestId,
    details: cleanDetails(entry.details),
  };

  if (session) {
    const [created] = await AuditLog.create([record], { session });
    return created;
  }
  return AuditLog.create(record);
}

module.exports = { writeAudit };
