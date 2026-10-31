const assert = require("node:assert/strict");
const test = require("node:test");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const User = require("../models/User");
const { markNoShow } = require("../noShow");
const { unblockUser } = require("../controllers/canteenController");
const { confirmPayment } = require("../controllers/orderController");
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

test("the first no-show immediately blocks the student", async (t) => {
  const originalStartSession = mongoose.startSession;
  const originalFindOneAndUpdate = Order.findOneAndUpdate;
  const originalFindByIdAndUpdate = User.findByIdAndUpdate;
  mongoose.startSession = async () => ({
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  });
  let saved = false;
  Order.findOneAndUpdate = async (filter, update, options) => {
    assert.equal(filter.status, "ready");
    assert.deepEqual(update, {
      $set: { status: "no_show" },
      $unset: { pickupQrHash: 1, pickupQrExpiresAt: 1 },
    });
    assert.ok(options.session);
    return {
      _id: "order-id",
      user: "user-id",
      canteen: "canteen-id",
      status: update.$set.status,
    };
  };
  User.findByIdAndUpdate = async (_id, update, options) => {
    assert.deepEqual(update, { $inc: { noShowCount: 1 } });
    assert.ok(options.session);
    return {
      noShowCount: 1,
      isBlocked: false,
      async save(saveOptions) {
        assert.ok(saveOptions.session);
        this.isBlocked = true;
        saved = true;
      },
    };
  };
  t.after(() => {
    mongoose.startSession = originalStartSession;
    Order.findOneAndUpdate = originalFindOneAndUpdate;
    User.findByIdAndUpdate = originalFindByIdAndUpdate;
  });

  const order = await markNoShow("order-id");

  assert.equal(order.status, "no_show");
  assert.equal(saved, true);
});

test("staff can record payment for a no-show order", async (t) => {
  const originalFindById = Order.findById;
  const originalFindOneAndUpdate = Order.findOneAndUpdate;
  const canteenId = "507f1f77bcf86cd799439011";
  const order = {
    _id: "507f1f77bcf86cd799439013",
    user: "user-id",
    canteen: canteenId,
    orderNumber: "A1",
    status: "no_show",
    paymentStatus: "pending",
    toObject() {
      return { ...this, toObject: undefined };
    },
  };
  Order.findById = async () => order;
  Order.findOneAndUpdate = async (_filter, update) => {
    Object.assign(order, update.$set);
    return order;
  };
  t.after(() => {
    Order.findById = originalFindById;
    Order.findOneAndUpdate = originalFindOneAndUpdate;
  });

  const res = response();
  await confirmPayment(
    {
      params: { id: order._id },
      user: { _id: "507f1f77bcf86cd799439015", role: "canteen", managedCanteens: [canteenId] },
    },
    res,
    (err) => {
      throw err;
    }
  );

  assert.equal(order.paymentStatus, "paid");
  assert.equal(res.body.paymentStatus, "paid");
  assert.equal(res.body.paidBy, "507f1f77bcf86cd799439015");
  assert.ok(res.body.paidAt instanceof Date);
});

test("staff cannot unblock until the no-show order amount is recorded as paid", async (t) => {
  const originalExists = Order.exists;
  const originalFindOneAndUpdate = User.findOneAndUpdate;
  const canteenId = "507f1f77bcf86cd799439011";
  const existenceFilters = [];
  let userUpdateCalled = false;
  Order.exists = async (filter) => {
    existenceFilters.push(filter);
    return { _id: "order-id" };
  };
  User.findOneAndUpdate = async () => {
    userUpdateCalled = true;
    return { name: "Student" };
  };
  t.after(() => {
    Order.exists = originalExists;
    User.findOneAndUpdate = originalFindOneAndUpdate;
  });

  const res = response();
  await unblockUser(
    {
      params: { id: canteenId, userId: "507f1f77bcf86cd799439012" },
      user: { role: "canteen", managedCanteens: [canteenId] },
    },
    res,
    (err) => {
      throw err;
    }
  );

  assert.equal(existenceFilters.length, 2);
  assert.equal(existenceFilters[0].canteen, canteenId);
  assert.equal(Object.hasOwn(existenceFilters[1], "canteen"), false);
  assert.equal(res.statusCode, 409);
  assert.equal(userUpdateCalled, false);
});
