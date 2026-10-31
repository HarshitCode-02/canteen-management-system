const assert = require("node:assert/strict");
const test = require("node:test");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const { getSalesReport } = require("../controllers/orderController");

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

test("sales report validates the canteen id and period", async () => {
  const res = response();
  await getSalesReport(
    { query: { canteen: "not-an-id", days: "7" }, user: { role: "admin" } },
    res,
    (err) => {
      throw err;
    }
  );
  assert.equal(res.statusCode, 400);

  const invalidDays = response();
  await getSalesReport(
    {
      query: { canteen: "507f1f77bcf86cd799439011", days: "2" },
      user: { role: "admin" },
    },
    invalidDays,
    (err) => {
      throw err;
    }
  );
  assert.equal(invalidDays.statusCode, 400);
});

test("sales report denies staff outside their assigned canteen", async () => {
  const res = response();
  await getSalesReport(
    {
      query: { canteen: "507f1f77bcf86cd799439011", days: "7" },
      user: { role: "canteen", managedCanteens: [] },
    },
    res,
    (err) => {
      throw err;
    }
  );
  assert.equal(res.statusCode, 403);
});

test("sales report returns totals, best sellers, and IST pickup hours", async (t) => {
  const originalAggregate = Order.aggregate;
  const pipelines = [];
  Order.aggregate = async (pipeline) => {
    pipelines.push(pipeline);
    const group = pipeline.find((stage) => stage.$group)?.$group;
    if (group?._id === null) {
      return [{ orders: 4, revenue: 600, unpaid: 100, cancelled: 1, noShows: 1 }];
    }
    if (group?._id === "$items.name") {
      return [{ name: "Chai", qty: 6, revenue: 120 }];
    }
    return [{ hour: 13, orders: 3 }];
  };
  t.after(() => {
    Order.aggregate = originalAggregate;
  });

  const canteenId = "507f1f77bcf86cd799439011";
  const res = response();
  await getSalesReport(
    {
      query: { canteen: canteenId, days: "7" },
      user: { role: "canteen", managedCanteens: [new mongoose.Types.ObjectId(canteenId)] },
    },
    res,
    (err) => {
      throw err;
    }
  );

  assert.deepEqual(res.body, {
    days: 7,
    orders: 4,
    revenue: 600,
    unpaid: 100,
    cancelled: 1,
    noShows: 1,
    best: [{ name: "Chai", qty: 6, revenue: 120 }],
    hours: [{ hour: 13, orders: 3 }],
  });
  assert.equal(pipelines.length, 3);
  assert.equal(
    pipelines[2][1].$group._id.$hour.timezone,
    "Asia/Kolkata"
  );
});
