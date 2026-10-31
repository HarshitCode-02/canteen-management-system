const assert = require("node:assert/strict");
const test = require("node:test");
const errorHandler = require("../middleware/errorHandler");

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

test("production 500 responses hide internal messages and logs omit error details", (t) => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalConsoleError = console.error;
  let logArgs;
  t.after(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    console.error = originalConsoleError;
  });

  process.env.NODE_ENV = "production";
  console.error = (...args) => { logArgs = args; };
  const res = response();
  errorHandler(
    new Error("sensitive database detail"),
    { method: "GET", path: "/api/orders" },
    res,
    (err) => { throw err; }
  );

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { message: "Server error" });
  assert.deepEqual(logArgs, [
    "Request failed",
    { method: "GET", path: "/api/orders", status: 500, errorName: "Error" },
  ]);
});

test("known client errors retain their safe message", (t) => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalConsoleError = console.error;
  t.after(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    console.error = originalConsoleError;
  });
  process.env.NODE_ENV = "production";
  console.error = () => {};
  const res = response();

  errorHandler(
    Object.assign(new Error("Invalid input"), { status: 400 }),
    { method: "POST", path: "/api/orders" },
    res,
    (err) => { throw err; }
  );

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { message: "Invalid input" });
});
