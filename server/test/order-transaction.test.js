const assert = require("node:assert/strict");
const test = require("node:test");
const crypto = require("node:crypto");
const mongoose = require("mongoose");
const Canteen = require("../models/Canteen");
const Counter = require("../models/Counter");
const MenuItem = require("../models/MenuItem");
const Order = require("../models/Order");
const User = require("../models/User");
const { createOrder } = require("../controllers/orderController");
const mockAuditLog = require("../testUtils/auditMock");

mockAuditLog(test);

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

test("order creation performs active-order, slot, and counter operations in one transaction", async (t) => {
  const session = { transactionId: "test-transaction" };
  const originals = {
    startSession: mongoose.startSession,
    userUpdate: User.findOneAndUpdate,
    findOrder: Order.findOne,
    countOrders: Order.countDocuments,
    findMenuItems: MenuItem.find,
    updateCanteen: Canteen.findOneAndUpdate,
    updateCounter: Counter.findOneAndUpdate,
    saveOrder: Order.prototype.save,
  };
  t.after(() => {
    mongoose.startSession = originals.startSession;
    User.findOneAndUpdate = originals.userUpdate;
    Order.findOne = originals.findOrder;
    Order.countDocuments = originals.countOrders;
    MenuItem.find = originals.findMenuItems;
    Canteen.findOneAndUpdate = originals.updateCanteen;
    Counter.findOneAndUpdate = originals.updateCounter;
    Order.prototype.save = originals.saveOrder;
  });

  session.withTransaction = async (callback) => callback();
  session.endSession = async () => {};
  mongoose.startSession = async () => session;
  User.findOneAndUpdate = async (filter, update, options) => {
    assert.equal(filter._id, "507f1f77bcf86cd799439012");
    assert.deepEqual(update, { $inc: { orderLockVersion: 1 } });
    assert.equal(options.session, session);
    return { _id: filter._id };
  };
  Order.findOne = () => ({
    session: async (providedSession) => {
      assert.equal(providedSession, session);
      return null;
    },
  });
  MenuItem.find = () => ({
    session: async (providedSession) => {
      assert.equal(providedSession, session);
      return [{
        _id: "507f1f77bcf86cd799439011",
        canteen: "507f1f77bcf86cd799439013",
        name: "Sandwich",
        price: 45,
        isAvailable: true,
      }];
    },
  });
  Canteen.findOneAndUpdate = async (filter, update, options) => {
    assert.equal(filter.isActive, true);
    assert.equal(filter.isOpen, true);
    assert.deepEqual(update, { $inc: { orderLockVersion: 1 } });
    assert.equal(options.session, session);
    return {
      _id: "507f1f77bcf86cd799439013",
      name: "Test Canteen",
      slotLimit: 5,
    };
  };
  Order.countDocuments = () => ({
    session: async (providedSession) => {
      assert.equal(providedSession, session);
      return 2;
    },
  });
  Counter.findOneAndUpdate = async (_filter, _update, options) => {
    assert.equal(options.session, session);
    return { seq: 7 };
  };
  Order.prototype.save = async function (options) {
    assert.equal(options.session, session);
    return this;
  };

  const res = response();
  await createOrder({
    user: { _id: "507f1f77bcf86cd799439012", isBlocked: false },
    body: {
      items: [{ menuItemId: "507f1f77bcf86cd799439011", qty: 2 }],
      pickupTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
  }, res, (err) => { throw err; });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.orderNumber, "A7");
  assert.equal(res.body.total, 90);
  assert.equal(res.body.items[0].price, 45);
});

test("retries with the same idempotency key return the saved order without notifying twice", async (t) => {
  const session = {};
  const pickupTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const idempotencyKey = "f5722da9-60c6-40b5-a5be-88ac7850b1c2";
  const requestFingerprint = crypto.createHash("sha256").update(JSON.stringify({
    items: [{ menuItemId: "507f1f77bcf86cd799439011", qty: 2 }],
    pickupTime: new Date(pickupTime).toISOString(),
    note: "",
  })).digest("hex");
  const savedOrder = {
    _id: "507f1f77bcf86cd799439014",
    orderNumber: "A7",
    pickupCode: "1234",
    idempotencyKey,
    requestFingerprint,
    toObject() {
      return { ...this };
    },
  };
  const originals = {
    startSession: mongoose.startSession,
    findOrder: Order.findOne,
  };
  t.after(() => {
    mongoose.startSession = originals.startSession;
    Order.findOne = originals.findOrder;
  });
  session.withTransaction = async (callback) => callback();
  session.endSession = async () => {};
  mongoose.startSession = async () => session;
  Order.findOne = (filter) => {
    assert.deepEqual(filter, {
      user: "507f1f77bcf86cd799439012",
      idempotencyKey,
    });
    const query = {
      select(fields) {
        assert.equal(fields, "+requestFingerprint");
        return this;
      },
      session: async (providedSession) => {
        assert.equal(providedSession, session);
        return savedOrder;
      },
    };
    return query;
  };

  const res = response();
  await createOrder({
    user: { _id: "507f1f77bcf86cd799439012", isBlocked: false },
    headers: { "idempotency-key": idempotencyKey },
    body: {
      items: [{ menuItemId: "507f1f77bcf86cd799439011", qty: 2 }],
      pickupTime,
    },
  }, res, (err) => { throw err; });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.orderNumber, "A7");
  assert.equal(Object.hasOwn(res.body, "idempotencyKey"), false);
  assert.equal(Object.hasOwn(res.body, "requestFingerprint"), false);
});

test("an idempotency key cannot be reused for a different order payload", async (t) => {
  const session = {};
  const pickupTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const idempotencyKey = "f5722da9-60c6-40b5-a5be-88ac7850b1c2";
  const originals = {
    startSession: mongoose.startSession,
    findOrder: Order.findOne,
  };
  t.after(() => {
    mongoose.startSession = originals.startSession;
    Order.findOne = originals.findOrder;
  });
  session.withTransaction = async (callback) => callback();
  session.endSession = async () => {};
  mongoose.startSession = async () => session;
  Order.findOne = () => ({
    select() {
      return this;
    },
    session: async () => ({
      requestFingerprint: "not-the-request-fingerprint",
    }),
  });

  const res = response();
  await createOrder({
    user: { _id: "507f1f77bcf86cd799439012", isBlocked: false },
    headers: { "idempotency-key": idempotencyKey },
    body: {
      items: [{ menuItemId: "507f1f77bcf86cd799439011", qty: 2 }],
      pickupTime,
    },
  }, res, (err) => { throw err; });

  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /different order/);
});
