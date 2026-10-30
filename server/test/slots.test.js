const assert = require("node:assert/strict");
const test = require("node:test");
const { SLOT_MS, slotStart } = require("../slots");

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
