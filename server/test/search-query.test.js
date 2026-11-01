const assert = require("node:assert/strict");
const test = require("node:test");
const { normalizeSearchQuery, escapeRegex } = require("../services/searchQuery");

test("search query normalization accepts only trimmed strings", () => {
  assert.equal(normalizeSearchQuery("  masala dosa  "), "masala dosa");
  assert.equal(normalizeSearchQuery(undefined), "");
  assert.equal(normalizeSearchQuery({ $ne: "" }), "");
});

test("search regex escapes user-supplied metacharacters", () => {
  assert.equal(escapeRegex(".*(tea)+"), "\\.\\*\\(tea\\)\\+");
});
