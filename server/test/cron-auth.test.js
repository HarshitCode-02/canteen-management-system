const assert = require("node:assert/strict");
const test = require("node:test");
const cronAuth = require("../middleware/cronAuth");

const response = () => ({
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test("cron endpoint authorization requires the configured secret", (t) => {
  const originalSecret = process.env.CRON_SECRET;
  t.after(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  delete process.env.CRON_SECRET;
  const missingSecretResponse = response();
  cronAuth({ get: () => undefined }, missingSecretResponse, () => {
    assert.fail("Cron should not run without a configured secret");
  });
  assert.equal(missingSecretResponse.statusCode, 503);

  process.env.CRON_SECRET = "test-cron-secret";
  const deniedResponse = response();
  cronAuth({ get: () => "Bearer wrong-secret" }, deniedResponse, () => {
    assert.fail("Invalid cron secret must be rejected");
  });
  assert.equal(deniedResponse.statusCode, 401);

  const allowedResponse = response();
  let nextCalled = false;
  cronAuth({ get: () => "Bearer test-cron-secret" }, allowedResponse, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
});
