const assert = require("node:assert/strict");
const test = require("node:test");
const AuditLog = require("../models/AuditLog");
const { writeAudit } = require("../services/auditLog");

test("audit records retain safe metadata and omit unapproved fields", async (t) => {
  const originalCreate = AuditLog.create;
  let saved;
  AuditLog.create = async (record) => {
    saved = record;
    return record;
  };
  t.after(() => { AuditLog.create = originalCreate; });

  await writeAudit({
    requestId: "request-id",
    user: { _id: "507f1f77bcf86cd799439011", role: "admin" },
  }, {
    eventType: "menu.updated",
    entityType: "menuItem",
    entityId: "507f1f77bcf86cd799439012",
    details: { priceAfter: 75, isAvailable: false, note: "not retained" },
  });

  assert.equal(saved.actor, "507f1f77bcf86cd799439011");
  assert.equal(saved.actorRole, "admin");
  assert.equal(saved.requestId, "request-id");
  assert.deepEqual(saved.details, { priceAfter: 75, isAvailable: false });
});
