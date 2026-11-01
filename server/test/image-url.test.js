const assert = require("node:assert/strict");
const test = require("node:test");
const { isValidImageUrl } = require("../utils/imageUrl");

test("image URLs allow empty optional values and HTTP(S) URLs", () => {
  assert.equal(isValidImageUrl(""), true);
  assert.equal(isValidImageUrl(" https://images.example.com/dosa.jpg "), true);
  assert.equal(isValidImageUrl("http://images.example.com/dosa.jpg"), true);
});

test("image URLs reject unsupported protocols, credentials, and oversized input", () => {
  assert.equal(isValidImageUrl("javascript:alert(1)"), false);
  assert.equal(isValidImageUrl("data:image/png;base64,abc"), false);
  assert.equal(isValidImageUrl("https://user:pass@example.com/image.png"), false);
  assert.equal(isValidImageUrl("https://example.com/" + "a".repeat(2050)), false);
  assert.equal(isValidImageUrl(null), false);
});
