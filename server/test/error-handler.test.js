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

test("500 responses in production hide internal messages and logs omit error details", (t) => {
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
    { method: "GET", path: "/api/orders", requestId: "request-123" },
    res,
    (err) => { throw err; }
  );

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { message: "Something went wrong. Please try again." });
  assert.deepEqual(logArgs, [
    "Request failed",
    { requestId: "request-123", method: "GET", path: "/api/orders", status: 500, errorName: "Error" },
  ]);
});

test("development 500 responses also hide internal messages from users", (t) => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalConsoleError = console.error;
  t.after(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    console.error = originalConsoleError;
  });
  process.env.NODE_ENV = "development";
  console.error = () => {};
  const res = response();

  errorHandler(
    new Error("Cannot read properties of undefined"),
    { method: "GET", path: "/api/reviews" },
    res,
    (err) => { throw err; }
  );

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { message: "Something went wrong. Please try again." });
});

test("Mongoose validation errors return a safe client message", (t) => {
  const originalConsoleError = console.error;
  t.after(() => { console.error = originalConsoleError; });
  console.error = () => {};
  const res = response();

  errorHandler(
    Object.assign(new Error("Canteen validation failed: logo: Cast to string failed"), { name: "ValidationError" }),
    { method: "PATCH", path: "/api/canteens/123", requestId: "request-456" },
    res,
    (err) => { throw err; }
  );

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { message: "Please check the information you entered and try again." });
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
