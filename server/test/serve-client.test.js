const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const express = require("express");
const serveClient = require("../middleware/serveClient");

test("serves the React app for browser routes but leaves API paths to the API", async (t) => {
  const buildDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "canteen-client-"));
  fs.writeFileSync(path.join(buildDirectory, "index.html"), "<main>client app</main>");
  t.after(() => fs.rmSync(buildDirectory, { recursive: true, force: true }));

  const app = express();
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  assert.equal(serveClient(app, buildDirectory), true);
  app.use((req, res) => res.status(404).json({ message: "Route not found" }));

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  }));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const page = await fetch(`${baseUrl}/account`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /client app/);

  const health = await fetch(`${baseUrl}/api/health`);
  assert.deepEqual(await health.json(), { status: "ok" });

  const missingApiRoute = await fetch(`${baseUrl}/api/missing`);
  assert.equal(missingApiRoute.status, 404);
  assert.deepEqual(await missingApiRoute.json(), { message: "Route not found" });
});

test("does not install the client fallback when no production build exists", () => {
  const app = express();
  assert.equal(serveClient(app, path.join(os.tmpdir(), "missing-canteen-client-build")), false);
});
