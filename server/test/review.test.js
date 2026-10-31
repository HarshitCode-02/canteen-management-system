const assert = require("node:assert/strict");
const test = require("node:test");
const Order = require("../models/Order");
const MenuItem = require("../models/MenuItem");
const Review = require("../models/Review");
const { createReview, getMenuItemReviews, moderateReview } = require("../controllers/reviewController");
const { loadVisibleRatings } = require("../services/reviewRatings");
const mockAuditLog = require("../testUtils/auditMock");

mockAuditLog(test);

const userId = "507f1f77bcf86cd799439011";
const orderId = "507f1f77bcf86cd799439012";
const itemId = "507f1f77bcf86cd799439013";

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

const createRequest = (overrides = {}) => ({
  body: { orderId, menuItemId: itemId, rating: 5, text: "Fresh food", user: "forged-user-id", ...overrides },
  user: { _id: userId, role: "student" },
});

test("review creation uses authenticated owner and requires a collected order item", async (t) => {
  const originals = {
    findOne: Order.findOne,
    itemExists: MenuItem.exists,
    create: Review.create,
  };
  let orderFilter;
  let savedReview;
  Order.findOne = (filter) => {
    orderFilter = filter;
    return { select: async () => ({ _id: orderId, items: [{ menuItem: itemId }] }) };
  };
  MenuItem.exists = async () => true;
  Review.create = async (data) => {
    savedReview = data;
    return data;
  };
  t.after(() => {
    Order.findOne = originals.findOne;
    MenuItem.exists = originals.itemExists;
    Review.create = originals.create;
  });

  const res = response();
  await createReview(createRequest(), res, (err) => { throw err; });

  assert.equal(res.statusCode, 201);
  assert.equal(orderFilter.user, userId);
  assert.equal(orderFilter.status, "collected");
  assert.equal(savedReview.user, userId);
  assert.equal(savedReview.rating, 5);
  assert.equal(savedReview.text, "Fresh food");
  assert.equal(Object.hasOwn(savedReview, "forged-user-id"), false);
});

test("review creation rejects an item not present in the authenticated user's collected order", async (t) => {
  const originalFindOne = Order.findOne;
  const originalItemExists = MenuItem.exists;
  let itemLookup = false;
  Order.findOne = () => ({ select: async () => ({ _id: orderId, items: [{ menuItem: "507f1f77bcf86cd799439014" }] }) });
  MenuItem.exists = async () => { itemLookup = true; return true; };
  t.after(() => {
    Order.findOne = originalFindOne;
    MenuItem.exists = originalItemExists;
  });

  const res = response();
  await createReview(createRequest(), res, (err) => { throw err; });

  assert.equal(res.statusCode, 403);
  assert.equal(itemLookup, false);
});

test("review creation validates rating and review length", async (t) => {
  const originalFindOne = Order.findOne;
  Order.findOne = () => assert.fail("invalid reviews must be rejected before database access");
  t.after(() => { Order.findOne = originalFindOne; });

  const badRating = response();
  await createReview(createRequest({ rating: 6 }), badRating, (err) => { throw err; });
  assert.equal(badRating.statusCode, 400);

  const longReview = response();
  await createReview(createRequest({ text: "x".repeat(501) }), longReview, (err) => { throw err; });
  assert.equal(longReview.statusCode, 400);
});

test("duplicate review index conflicts return 409", async (t) => {
  const originals = {
    findOne: Order.findOne,
    itemExists: MenuItem.exists,
    create: Review.create,
  };
  Order.findOne = () => ({ select: async () => ({ _id: orderId, items: [{ menuItem: itemId }] }) });
  MenuItem.exists = async () => true;
  Review.create = async () => { throw Object.assign(new Error("duplicate"), { code: 11000 }); };
  t.after(() => {
    Order.findOne = originals.findOne;
    MenuItem.exists = originals.itemExists;
    Review.create = originals.create;
  });

  const res = response();
  await createReview(createRequest(), res, (err) => { throw err; });

  assert.equal(res.statusCode, 409);
});

test("public review listing includes only visible reviews and validates page numbers", async (t) => {
  const originalFind = Review.find;
  const originalCount = Review.countDocuments;
  let filter;
  let limit;
  Review.find = (value) => {
    filter = value;
    const query = {
      select() { return this; },
      sort() { return this; },
      skip() { return this; },
      limit(value) { limit = value; return this; },
      then(resolve, reject) { return Promise.resolve([{ rating: 4 }]).then(resolve, reject); },
    };
    return query;
  };
  Review.countDocuments = async () => 1;
  t.after(() => {
    Review.find = originalFind;
    Review.countDocuments = originalCount;
  });

  const res = response();
  await getMenuItemReviews({ params: { menuItemId: itemId }, query: { page: "1" } }, res, (err) => { throw err; });

  assert.deepEqual(filter, { menuItem: itemId, isVisible: true });
  assert.equal(limit, 20);
  assert.equal(res.body.total, 1);
});

test("only moderation changes visibility when the supplied value is boolean", async (t) => {
  const originalUpdate = Review.findByIdAndUpdate;
  let update;
  Review.findByIdAndUpdate = async (_id, value) => {
    update = value;
    return { _id: itemId, isVisible: value.$set.isVisible };
  };
  t.after(() => { Review.findByIdAndUpdate = originalUpdate; });

  const res = response();
  await moderateReview({ params: { id: itemId }, body: { isVisible: false } }, res, (err) => { throw err; });

  assert.equal(res.body.isVisible, false);
  assert.equal(update.$set.isVisible, false);
});

test("rating aggregation rounds the average and counts only visible records", async (t) => {
  const originalAggregate = Review.aggregate;
  let pipeline;
  Review.aggregate = async (value) => {
    pipeline = value;
    return [{ _id: itemId, average: 4.26, count: 7 }];
  };
  t.after(() => { Review.aggregate = originalAggregate; });

  const ratings = await loadVisibleRatings([itemId]);

  assert.equal(pipeline[0].$match.isVisible, true);
  assert.deepEqual(ratings.get(itemId), { average: 4.3, count: 7 });
});
