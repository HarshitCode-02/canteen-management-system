const assert = require("node:assert/strict");
const test = require("node:test");
const { isValidCanteenLogo } = require("../utils/canteenLogo");

test("canteen logo is optional and accepts HTTP or HTTPS URLs", () => {
  assert.equal(isValidCanteenLogo(""), true);
  assert.equal(isValidCanteenLogo("  "), true);
  assert.equal(isValidCanteenLogo("https://images.example.test/canteen.png"), true);
  assert.equal(isValidCanteenLogo("http://images.example.test/canteen.png"), true);
});

test("canteen logo rejects non-HTTP schemes, credentialed URLs, and oversized values", () => {
  assert.equal(isValidCanteenLogo("javascript:alert(1)"), false);
  assert.equal(isValidCanteenLogo("data:image/svg+xml,<svg/>"), false);
  assert.equal(isValidCanteenLogo("https://user:password@example.test/logo.png"), false);
  assert.equal(isValidCanteenLogo(`https://example.test/${"a".repeat(2050)}`), false);
  assert.equal(isValidCanteenLogo(42), false);
});
