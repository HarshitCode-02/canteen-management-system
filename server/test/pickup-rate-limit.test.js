const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const express = require("express");
const { pickupVerifyLimiter } = require("../middleware/authRateLimit");

const startServer = async (t) => {
  const app = express();
  app.use(express.json());
  app.post(
    "/verify",
    (req, _res, next) => {
      req.user = { _id: req.get("x-staff-id") };
      next();
    },
    pickupVerifyLimiter,
    (req, res) => res.status(req.body.valid ? 200 : 400).json({ ok: req.body.valid }),
  );
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  }));
  return `http://127.0.0.1:${server.address().port}/verify`;
};

const postAttempt = (url, staffId, valid) =>
  fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-staff-id": staffId,
    },
    body: JSON.stringify({ valid }),
  });

test("pickup-code limiter caps failed attempts per authenticated staff account", async (t) => {
  const url = await startServer(t);
  const staffId = `staff-${crypto.randomUUID()}`;
  let response;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    response = await postAttempt(url, staffId, false);
    assert.equal(response.status, 400);
  }
  response = await postAttempt(url, staffId, false);
  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), {
    message: "Too many pickup-code verification attempts. Try again later.",
  });
});

test("successful pickup verifications do not consume the failed-attempt limit", async (t) => {
  const url = await startServer(t);
  const staffId = `staff-${crypto.randomUUID()}`;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await postAttempt(url, staffId, true);
    assert.equal(response.status, 200);
  }

  const firstFailure = await postAttempt(url, staffId, false);
  assert.equal(firstFailure.status, 400);
});
