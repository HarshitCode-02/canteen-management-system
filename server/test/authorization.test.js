const assert = require("node:assert/strict");
const test = require("node:test");
const { canManageCanteen } = require("../middleware/auth");

const canteenId = "507f1f77bcf86cd799439011";
const otherCanteenId = "507f1f77bcf86cd799439012";

test("admin can manage any canteen", () => {
  assert.equal(canManageCanteen({ role: "admin" }, canteenId), true);
});

test("canteen staff can manage only assigned canteens", () => {
  const staff = { role: "canteen", managedCanteens: [canteenId] };

  assert.equal(canManageCanteen(staff, canteenId), true);
  assert.equal(canManageCanteen(staff, otherCanteenId), false);
});

test("missing user or canteen is denied", () => {
  assert.equal(canManageCanteen(null, canteenId), false);
  assert.equal(canManageCanteen({ role: "admin" }, null), false);
});
