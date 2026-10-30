const assert = require("node:assert/strict");
const test = require("node:test");
const Order = require("../models/Order");
const User = require("../models/User");
const { markNoShow } = require("../noShow");
const { unblockUser } = require("../controllers/canteenController");
const { confirmPayment } = require("../controllers/orderController");

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
  const originalFindOneAndUpdate = Order.findOneAndUpdate;
  const originalFindByIdAndUpdate = User.findByIdAndUpdate;
  let saved = false;
  Order.findOneAndUpdate = async (filter, update) => {
    assert.equal(filter.status, "ready");
    assert.deepEqual(update, { status: "no_show" });
    return {
      _id: "order-id",
      user: "user-id",
      canteen: "canteen-id",
      status: update.status,
    };
  };
  User.findByIdAndUpdate = async (_id, update) => {
    assert.deepEqual(update, { $inc: { noShowCount: 1 } });
    return {
      noShowCount: 1,
      isBlocked: false,
      async save() {
        this.isBlocked = true;
        saved = true;
      },
    };
  };
  t.after(() => {
    Order.findOneAndUpdate = originalFindOneAndUpdate;
    User.findByIdAndUpdate = originalFindByIdAndUpdate;
  });

  const order = await markNoShow("order-id");

  assert.equal(order.status, "no_show");
  assert.equal(saved, true);
});

test("staff can record payment for a no-show order", async (t) => {
  const originalFindById = Order.findById;
  const canteenId = "507f1f77bcf86cd799439011";
  const order = {
    _id: "507f1f77bcf86cd799439013",
    user: "user-id",
    canteen: canteenId,
    orderNumber: "A1",
    status: "no_show",
    paymentStatus: "pending",
    async save() {},
  };
  Order.findById = async () => order;
  t.after(() => {
    Order.findById = originalFindById;
  });

  const res = response();
  await confirmPayment(
    {
      params: { id: order._id },
      user: { role: "canteen", managedCanteens: [canteenId] },
    },
    res,
    (err) => {
      throw err;
    }
  );

  assert.equal(order.paymentStatus, "paid");
  assert.equal(res.body, order);
});

test("staff cannot unblock until the no-show order amount is recorded as paid", async (t) => {
  const originalExists = Order.exists;
  const originalFindOneAndUpdate = User.findOneAndUpdate;
  const canteenId = "507f1f77bcf86cd799439011";
  let existsCalls = 0;
  let userUpdateCalled = false;
  Order.exists = async () => {
    existsCalls += 1;
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

  assert.equal(existsCalls, 2);
  assert.equal(res.statusCode, 409);
  assert.equal(userUpdateCalled, false);
});
