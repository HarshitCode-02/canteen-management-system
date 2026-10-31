const AuditLog = require("../models/AuditLog");

function mockAuditLog(test) {
  const originalCreate = AuditLog.create;
  AuditLog.create = async (records) => records;
  test.after(() => {
    AuditLog.create = originalCreate;
  });
}

module.exports = mockAuditLog;
