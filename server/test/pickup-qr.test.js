const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const Order = require("../models/Order");
const { createPickupQr, verifyPickupQr } = require("../controllers/orderController");
const mockAuditLog = require("../testUtils/auditMock");

mockAuditLog(test);

const orderId = "507f1f77bcf86cd799439011";
const canteenId = "507f1f77bcf86cd799439012";
const ownerId = "507f1f77bcf86cd799439013";
const staffId = "507f1f77bcf86cd799439014";
const token = crypto.randomBytes(32).toString("base64url");
const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

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

const makeOrder = (state) => ({ ...state });
const ownerRequest = () => ({
  params: { id: orderId },
  user: { _id: ownerId, role: "student" },
});
const staffRequest = (value = token) => ({
  body: { token: value },
  user: { _id: staffId, role: "canteen", managedCanteens: [canteenId] },
});

test("QR issuance returns a random token and stores only its hash", async (t) => {
  const originalFindOne = Order.findOne;
  const originalFindOneAndUpdate = Order.findOneAndUpdate;
  const readyAt = new Date(Date.now() - 60_000);
  const order = { _id: orderId, user: ownerId, status: "ready", readyAt };
  Order.findOne = (filter) => ({
    select: async () => {
      assert.deepEqual(filter, { _id: orderId, user: ownerId });
      return order;
    },
  });
  let update;
  Order.findOneAndUpdate = async (_filter, changes) => {
    update = changes;
    return order;
  };
  t.after(() => {
    Order.findOne = originalFindOne;
    Order.findOneAndUpdate = originalFindOneAndUpdate;
  });

  const res = response();
  await createPickupQr(ownerRequest(), res, (err) => { throw err; });

  assert.equal(res.statusCode, 201);
  assert.match(res.body.token, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(update.$set.pickupQrHash, res.body.token);
  assert.equal(
    update.$set.pickupQrHash,
    crypto.createHash("sha256").update(res.body.token).digest("hex")
  );
  assert.equal(update.$set.pickupQrExpiresAt.getTime(), readyAt.getTime() + 30 * 60 * 1000);
});

test("QR issuance rejects orders whose pickup window has expired", async (t) => {
  const originalFindOne = Order.findOne;
  const originalFindOneAndUpdate = Order.findOneAndUpdate;
  Order.findOne = () => ({
    select: async () => ({
      _id: orderId,
      user: ownerId,
      status: "ready",
      readyAt: new Date(Date.now() - 31 * 60 * 1000),
    }),
  });
  Order.findOneAndUpdate = async () => {
    assert.fail("expired QR must not be issued");
  };
  t.after(() => {
    Order.findOne = originalFindOne;
    Order.findOneAndUpdate = originalFindOneAndUpdate;
  });

  const res = response();
  await createPickupQr(ownerRequest(), res, (err) => { throw err; });

  assert.equal(res.statusCode, 410);
});

test("QR verification rejects malformed tokens before querying orders", async (t) => {
  const originalFindOne = Order.findOne;
  Order.findOne = () => assert.fail("malformed token must not query orders");
  t.after(() => { Order.findOne = originalFindOne; });

  const res = response();
  await verifyPickupQr(staffRequest("order-id"), res, (err) => { throw err; });

  assert.equal(res.statusCode, 400);
});

test("QR verification enforces canteen ownership before collection", async (t) => {
  const originalFindOne = Order.findOne;
  const originalFindOneAndUpdate = Order.findOneAndUpdate;
  Order.findOne = () => ({
    select: async () => ({
      _id: orderId,
      canteen: canteenId,
      status: "ready",
      pickupQrHash: tokenHash,
      pickupQrExpiresAt: new Date(Date.now() + 60_000),
    }),
  });
  Order.findOneAndUpdate = () => assert.fail("unauthorized staff must not collect");
  t.after(() => {
    Order.findOne = originalFindOne;
    Order.findOneAndUpdate = originalFindOneAndUpdate;
  });

  const res = response();
  await verifyPickupQr({
    ...staffRequest(),
    user: { _id: staffId, role: "canteen", managedCanteens: ["507f1f77bcf86cd799439099"] },
  }, res, (err) => { throw err; });

  assert.equal(res.statusCode, 403);
});

test("only one simultaneous QR scan can collect and QR collection leaves payment pending", async (t) => {
  const originalFindOne = Order.findOne;
  const originalFindOneAndUpdate = Order.findOneAndUpdate;
  const state = {
    _id: orderId,
    canteen: canteenId,
    user: ownerId,
    status: "ready",
    orderNumber: "A1",
    paymentStatus: "pending",
    pickupQrHash: tokenHash,
    pickupQrExpiresAt: new Date(Date.now() + 60_000),
  };
  Order.findOne = (filter) => ({
    select: async () => {
      assert.equal(filter.pickupQrHash, tokenHash);
      return makeOrder(state);
    },
  });
  Order.findOneAndUpdate = async (filter, update) => {
    if (
      state.status !== filter.status ||
      state.pickupQrHash !== filter.pickupQrHash ||
      state.pickupQrExpiresAt <= filter.pickupQrExpiresAt.$gt
    ) return null;
    Object.assign(state, update.$set);
    delete state.pickupQrHash;
    delete state.pickupQrExpiresAt;
    return makeOrder(state);
  };
  t.after(() => {
    Order.findOne = originalFindOne;
    Order.findOneAndUpdate = originalFindOneAndUpdate;
  });

  const responses = [response(), response()];
  await Promise.all(responses.map((res) => verifyPickupQr(staffRequest(), res, (err) => { throw err; })));

  assert.deepEqual(responses.map((res) => res.statusCode).sort(), [200, 409]);
  assert.equal(state.status, "collected");
  assert.equal(state.paymentStatus, "pending");
  assert.equal(state.collectedBy, staffId);
  assert.ok(state.collectedAt instanceof Date);
});
