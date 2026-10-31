const assert = require("node:assert/strict");
const test = require("node:test");
const Order = require("../models/Order");
const { assist, suggestMeals } = require("../controllers/smartController");
const { suggestMealCombinations } = require("../services/mealSuggestions");

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

const menu = [
  { _id: "a", canteen: { _id: "one", name: "North" }, name: "Sandwich", category: "Snacks", price: 60 },
  { _id: "b", canteen: { _id: "one", name: "North" }, name: "Tea", category: "Drinks", price: 40 },
  { _id: "c", canteen: { _id: "two", name: "South" }, name: "Rice", category: "Meals", price: 75 },
  { _id: "d", canteen: { _id: "one", name: "North" }, name: "Juice", category: "Drinks", price: 50 },
];

test("meal suggestions include exact-budget combinations and never mix canteens", () => {
  const suggestions = suggestMealCombinations(menu, 10_000, 3);

  assert.ok(suggestions.some((suggestion) => suggestion.total === 100));
  assert.ok(suggestions.every((suggestion) => suggestion.total <= 100));
  assert.ok(suggestions.every((suggestion) =>
    suggestion.items.length === 1 ||
    suggestion.items.every((item) => item.id !== "c")
  ));
});

test("meal suggestions are deterministic, bounded, and omit combinations with no eligible items", () => {
  const largeMenu = Array.from({ length: 200 }, (_, index) => ({
    _id: String(index),
    canteen: { _id: "one", name: "North" },
    name: `Item ${index}`,
    category: "Snacks",
    price: 10 + (index % 10),
  }));
  const first = suggestMealCombinations(largeMenu, 5000, 4);
  const second = suggestMealCombinations(largeMenu, 5000, 4);

  assert.deepEqual(first, second);
  assert.ok(first.length <= 12);
  assert.deepEqual(suggestMealCombinations([], 1000), []);
});

test("meal suggestion endpoint rejects invalid budgets without querying the database", async () => {
  const res = response();
  await suggestMeals({ body: { budget: -1 }, user: { _id: "user-id" } }, res, (err) => { throw err; });

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /positive amount/);
});

test("assistant rejects empty or overlong messages", async () => {
  const empty = response();
  await assist({ body: { message: "  " }, user: { _id: "user-id" } }, empty, (err) => { throw err; });
  assert.equal(empty.statusCode, 400);

  const long = response();
  await assist({ body: { message: "x".repeat(301) }, user: { _id: "user-id" } }, long, (err) => { throw err; });
  assert.equal(long.statusCode, 400);
});

test("assistant order status query is scoped to the authenticated user", async (t) => {
  const originalFindOne = Order.findOne;
  let capturedFilter;
  const order = {
    orderNumber: "A4",
    status: "ready",
    canteen: { name: "North" },
  };
  const query = {
    select() { return this; },
    sort() { return this; },
    populate() { return this; },
    then(resolve, reject) { return Promise.resolve(order).then(resolve, reject); },
  };
  Order.findOne = (filter) => {
    capturedFilter = filter;
    return query;
  };
  t.after(() => { Order.findOne = originalFindOne; });

  const res = response();
  await assist({
    body: { message: "What is my order status? 507f1f77bcf86cd799439099" },
    user: { _id: "507f1f77bcf86cd799439013" },
  }, res, (err) => { throw err; });

  assert.equal(capturedFilter.user, "507f1f77bcf86cd799439013");
  assert.equal(res.body.intent, "check_order_status");
  assert.match(res.body.reply, /#A4.*ready/);
});
