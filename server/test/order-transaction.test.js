const assert = require("node:assert/strict");
const test = require("node:test");
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
