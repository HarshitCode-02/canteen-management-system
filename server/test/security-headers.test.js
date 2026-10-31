const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const securityHeaders = require("../middleware/securityHeaders");

test("Helmet security headers are applied to API responses", async (t) => {
  const app = express();
  app.use(securityHeaders);
  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  }));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/health`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.match(response.headers.get("content-security-policy"), /default-src 'self'/);
});
