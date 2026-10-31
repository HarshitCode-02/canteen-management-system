const assert = require("node:assert/strict");
const test = require("node:test");
const Order = require("../models/Order");
const { SLOT_MS, slotStart, countInSlot } = require("../slots");

test("pickup slots are ten minutes long", () => {
  assert.equal(SLOT_MS, 10 * 60 * 1000);
});

test("slotStart rounds a time down to its ten-minute boundary", () => {
  assert.equal(
    slotStart("2026-10-30T12:09:59.999Z").toISOString(),
    "2026-10-30T12:00:00.000Z"
  );
});

test("slotStart keeps an exact ten-minute boundary unchanged", () => {
  assert.equal(
    slotStart("2026-10-30T12:10:00.000Z").toISOString(),
    "2026-10-30T12:10:00.000Z"
  );
});

test("slot counts use the order-submission transaction session", async (t) => {
  const originalCountDocuments = Order.countDocuments;
  const session = { id: "test-session" };
  let capturedSession;
  Order.countDocuments = (filter) => ({
    session(value) {
      capturedSession = value;
      assert.equal(filter.canteen, "canteen-id");
      assert.deepEqual(filter.status, { $in: ["placed", "preparing", "ready"] });
      return Promise.resolve(3);
    },
  });
  t.after(() => {
    Order.countDocuments = originalCountDocuments;
  });

  const count = await countInSlot("canteen-id", "2026-10-30T12:05:00Z", session);
  assert.equal(count, 3);
  assert.equal(capturedSession, session);
});
