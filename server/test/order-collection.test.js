const assert = require("node:assert/strict");
const test = require("node:test");
const Order = require("../models/Order");
const { verifyAndCollect } = require("../controllers/orderController");
const mockAuditLog = require("../testUtils/auditMock");

mockAuditLog(test);

const orderId = "507f1f77bcf86cd799439011";
const canteenId = "507f1f77bcf86cd799439012";
const userId = "507f1f77bcf86cd799439013";

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

const makeOrder = (state) => ({
  ...state,
  toObject() {
    return { ...state };
  },
});

const request = (code, paid) => ({
  params: { id: orderId },
  body: { code, paid },
  user: { _id: userId, role: "canteen", managedCanteens: [canteenId] },
});

const installOrderState = (t, initialState) => {
  const originalFindById = Order.findById;
  const originalFindOneAndUpdate = Order.findOneAndUpdate;
  const state = { ...initialState };
  t.after(() => {
    Order.findById = originalFindById;
    Order.findOneAndUpdate = originalFindOneAndUpdate;
  });

  Order.findById = () => ({
    select: async () => makeOrder(state),
  });

  Order.findOneAndUpdate = (filter, update) => {
    const execute = async () => {
      if (
        state._id !== filter._id ||
        state.canteen !== filter.canteen ||
        state.status !== filter.status ||
        (filter.pickupCode && state.pickupCode !== filter.pickupCode) ||
        (filter.codeAttempts && state.codeAttempts >= filter.codeAttempts.$lt)
      ) {
        return null;
      }

      Object.assign(state, update.$set || {});
      for (const [field, amount] of Object.entries(update.$inc || {})) {
        state[field] = (state[field] || 0) + amount;
      }
      return makeOrder(state);
    };
    return {
      select: execute,
      then: (resolve, reject) => execute().then(resolve, reject),
    };
  };
  return state;
};

const readyOrder = () => ({
  _id: orderId,
  canteen: canteenId,
  user: userId,
  status: "ready",
  pickupCode: "0427",
  codeAttempts: 0,
  paymentStatus: "pending",
});

test("only one of two concurrent pickup verifications collects an order", async (t) => {
  const state = installOrderState(t, readyOrder());
  const responses = [response(), response()];
  const next = (err) => { throw err; };

  await Promise.all(responses.map((res) => verifyAndCollect(request("0427", false), res, next)));

  assert.deepEqual(responses.map((res) => res.statusCode).sort(), [200, 409]);
  assert.equal(state.status, "collected");
  assert.equal(state.paymentStatus, "pending");
});

test("pickup verification records payment only when staff explicitly confirm it", async (t) => {
  const state = installOrderState(t, readyOrder());
  const res = response();

  await verifyAndCollect(request("0427", true), res, (err) => { throw err; });

  assert.equal(res.statusCode, 200);
  assert.equal(state.status, "collected");
  assert.equal(state.paymentStatus, "paid");
});

test("pickup verification rejects non-boolean payment confirmation", async (t) => {
  installOrderState(t, readyOrder());
  const res = response();

  await verifyAndCollect(request("0427", "yes"), res, (err) => { throw err; });

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "paid must be true or false");
});

test("a failed pickup attempt increments the counter atomically", async (t) => {
  const state = installOrderState(t, readyOrder());
  const res = response();

  await verifyAndCollect(request("0000", false), res, (err) => { throw err; });

  assert.equal(res.statusCode, 400);
  assert.equal(state.codeAttempts, 1);
  assert.match(res.body.message, /attempts left/);
});
