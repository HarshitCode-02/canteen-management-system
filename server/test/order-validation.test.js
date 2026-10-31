const assert = require("node:assert/strict");
const test = require("node:test");
const { createOrder } = require("../controllers/orderController");

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

const request = (items) => ({
  user: { _id: "507f1f77bcf86cd799439012", isBlocked: false },
  body: { items, pickupTime: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
});

test("order creation rejects more than 20 item lines", async () => {
  const res = response();
  await createOrder(request(
    Array.from({ length: 21 }, (_, index) => ({
      menuItemId: `507f1f77bcf86cd7994390${String(index).padStart(2, "0")}`,
      qty: 1,
    }))
  ), res, (err) => { throw err; });
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /at most 20 item lines/);
});

test("duplicate item lines cannot exceed a combined quantity of 20", async () => {
  const menuItemId = "507f1f77bcf86cd799439011";
  const res = response();
  await createOrder(request([
    { menuItemId, qty: 11 },
    { menuItemId, qty: 10 },
  ]), res, (err) => { throw err; });
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Combined quantity.*20/);
});

test("order creation rejects null item entries with a clear validation error", async () => {
  const res = response();
  await createOrder(request([null]), res, (err) => { throw err; });
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Each item must include/);
});
