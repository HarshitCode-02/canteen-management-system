const assert = require("node:assert/strict");
const test = require("node:test");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const User = require("../models/User");
const NoShowReview = require("../models/NoShowReview");
const { markNoShow } = require("../noShow");
const { unblockUser, reviewBlockedUser } = require("../controllers/canteenController");
const { resolveNoShow } = require("../controllers/orderController");
const adminController = require("../controllers/adminController");
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
    assert.equal(update.$set.status, "no_show");
    assert.ok(update.$set.noShowAt instanceof Date);
    assert.deepEqual(update.$unset, { pickupQrHash: 1, pickupQrExpiresAt: 1 });
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
      body: { explanation: "Student explained they could not reach the counter in time." },
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

test("staff review requires an explanation before unblocking", async () => {
  const res = response();
  await unblockUser(
    {
      params: {
        id: "507f1f77bcf86cd799439011",
        userId: "507f1f77bcf86cd799439012",
      },
      body: {},
      user: {
        role: "canteen",
        managedCanteens: ["507f1f77bcf86cd799439011"],
      },
    },
    res,
    (err) => {
      throw err;
    }
  );
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /explanation/i);
});

test("staff can record a decision to keep a student blocked", async (t) => {
  const originalStartSession = mongoose.startSession;
  const originalOrderExists = Order.exists;
  const originalUserFindOne = User.findOne;
  const originalReviewCreate = NoShowReview.create;
  const canteenId = "507f1f77bcf86cd799439031";
  const userId = "507f1f77bcf86cd799439032";
  const orderId = "507f1f77bcf86cd799439033";
  let orderExistsCount = 0;
  let createdReview;
  mongoose.startSession = async () => ({
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  });
  Order.exists = () => {
    orderExistsCount += 1;
    return orderExistsCount === 1
      ? Promise.resolve({ _id: orderId })
      : { session: async () => ({ _id: orderId }) };
  };
  User.findOne = () => ({
    session: () => ({ select: async () => ({ name: "Student" }) }),
  });
  NoShowReview.create = async (rows) => {
    createdReview = rows[0];
    return rows;
  };
  t.after(() => {
    mongoose.startSession = originalStartSession;
    Order.exists = originalOrderExists;
    User.findOne = originalUserFindOne;
    NoShowReview.create = originalReviewCreate;
  });

  const res = response();
  await reviewBlockedUser({
    params: { id: canteenId, userId },
    body: {
      explanation: "Student explained that they arrived after the pickup window.",
      decision: "keep_blocked",
    },
    user: { _id: "507f1f77bcf86cd799439034", role: "canteen", managedCanteens: [canteenId] },
  }, res, (err) => {
    throw err;
  });

  assert.equal(orderExistsCount, 2);
  assert.equal(createdReview.decision, "kept_blocked");
  assert.equal(createdReview.order, orderId);
  assert.equal(res.statusCode, 200);
});

test("correcting a no-show requires an explicit corrected status", async () => {
  const res = response();
  await resolveNoShow(
    {
      params: { id: "507f1f77bcf86cd799439012" },
      body: { explanation: "The student collected this order before the timer ran." },
    },
    res,
    (err) => {
      throw err;
    }
  );
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /correctedStatus/);
});

test("admin unblock also requires a review explanation", async () => {
  const res = response();
  await adminController.unblockUser({
    params: { id: "507f1f77bcf86cd799439041" },
    body: {},
  }, res, (err) => {
    throw err;
  });
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /explanation/i);
});

test("admin can record a decision to keep a blocked account", async (t) => {
  const originalStartSession = mongoose.startSession;
  const originalOrderFind = Order.find;
  const originalUserFindOne = User.findOne;
  const originalReviewCreate = NoShowReview.create;
  const userId = "507f1f77bcf86cd799439051";
  const orderId = "507f1f77bcf86cd799439052";
  const canteenId = "507f1f77bcf86cd799439053";
  let createdReview;
  mongoose.startSession = async () => ({
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  });
  Order.find = () => ({
    select: async () => [{ _id: orderId, canteen: canteenId }],
  });
  User.findOne = () => ({
    session: () => ({ select: async () => ({ _id: userId, name: "Student" }) }),
  });
  NoShowReview.create = async (rows) => {
    createdReview = rows[0];
    return rows;
  };
  t.after(() => {
    mongoose.startSession = originalStartSession;
    Order.find = originalOrderFind;
    User.findOne = originalUserFindOne;
    NoShowReview.create = originalReviewCreate;
  });

  const res = response();
  await adminController.reviewBlockedUser({
    params: { id: userId },
    body: {
      explanation: "Student explained that they arrived after the pickup window.",
      decision: "keep_blocked",
    },
    user: { _id: "507f1f77bcf86cd799439054", role: "admin" },
  }, res, (err) => {
    throw err;
  });

  assert.equal(createdReview.decision, "kept_blocked");
  assert.equal(createdReview.order, orderId);
  assert.match(res.body.message, /remains blocked/);
});

test("staff correction can restore a collected order and clear its resulting block", async (t) => {
  const originalStartSession = mongoose.startSession;
  const originalOrderFindById = Order.findById;
  const originalOrderFindOneAndUpdate = Order.findOneAndUpdate;
  const originalUserFindById = User.findById;
  const originalReviewCreate = NoShowReview.create;
  const orderId = "507f1f77bcf86cd799439021";
  const userId = "507f1f77bcf86cd799439022";
  const canteenId = "507f1f77bcf86cd799439023";
  const now = new Date();
  const current = { _id: orderId, user: userId, canteen: canteenId, status: "no_show" };
  const corrected = {
    ...current,
    status: "collected",
    toObject() {
      return { ...this, toObject: undefined };
    },
  };
  const student = {
    _id: userId,
    noShowCount: 1,
    isBlocked: true,
    async save(options) {
      assert.ok(options.session);
    },
  };
  let review;
  let orderUpdate;
  mongoose.startSession = async () => ({
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  });
  Order.findById = () => ({ session: async () => current });
  Order.findOneAndUpdate = async (_filter, update) => {
    orderUpdate = update;
    return corrected;
  };
  User.findById = () => ({ session: async () => student });
  NoShowReview.create = async (rows) => {
    review = rows[0];
    return rows;
  };
  t.after(() => {
    mongoose.startSession = originalStartSession;
    Order.findById = originalOrderFindById;
    Order.findOneAndUpdate = originalOrderFindOneAndUpdate;
    User.findById = originalUserFindById;
    NoShowReview.create = originalReviewCreate;
  });

  const res = response();
  await resolveNoShow({
    params: { id: orderId },
    body: {
      explanation: "Student showed proof they collected the meal before the timeout.",
      correctedStatus: "collected",
    },
    user: { _id: "507f1f77bcf86cd799439024", role: "canteen", managedCanteens: [canteenId] },
  }, res, (err) => {
    throw err;
  });

  assert.equal(orderUpdate.$set.status, "collected");
  assert.ok(orderUpdate.$set.collectedAt instanceof Date);
  assert.equal(student.noShowCount, 0);
  assert.equal(student.isBlocked, false);
  assert.equal(review.decision, "order_corrected");
  assert.equal(review.correctedStatus, "collected");
  assert.equal(res.body.status, "collected");
  assert.equal(Object.hasOwn(res.body, "resolutionReason"), false);
});
