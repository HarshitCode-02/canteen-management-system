const assert = require("node:assert/strict");
const test = require("node:test");

test("exports the Express app for serverless hosting without listening on import", (t) => {
  const names = ["VERCEL", "MONGO_URI", "JWT_SECRET", "CLIENT_URL"];
  const originalEnvironment = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  t.after(() => {
    for (const [name, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  process.env.VERCEL = "1";
  process.env.MONGO_URI = "mongodb://127.0.0.1:27017/canteen-test";
  process.env.JWT_SECRET = "test-only-secret";
  delete process.env.CLIENT_URL;

  const app = require("../index");
  assert.equal(typeof app, "function");
  assert.equal(typeof app.handle, "function");
});
