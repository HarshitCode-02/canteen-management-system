const assert = require("node:assert/strict");
const test = require("node:test");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { resetUserPassword } = require("../controllers/adminController");

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

test("admin can reset a matching non-admin account and revoke its old token version", async (t) => {
  const originalFindOne = User.findOne;
  const user = {
    _id: "507f1f77bcf86cd799439011",
    email: "student@example.com",
    role: "student",
    tokenVersion: 2,
    passwordHash: "old-hash",
    async save() {},
  };
  User.findOne = () => ({ select: async () => user });
  t.after(() => {
    User.findOne = originalFindOne;
  });
  const res = response();

  await resetUserPassword(
    { body: { email: " Student@Example.com ", newPassword: "temporary-password" } },
    res,
    (err) => { throw err; }
  );

  assert.equal(user.tokenVersion, 3);
  assert.equal(await bcrypt.compare("temporary-password", user.passwordHash), true);
  assert.equal(res.statusCode, 200);
});

test("admin password reset validates email and password length", async () => {
  const invalidEmail = response();
  await resetUserPassword(
    { body: { email: "not-an-email", newPassword: "temporary-password" } },
    invalidEmail,
    (err) => { throw err; }
  );
  assert.equal(invalidEmail.statusCode, 400);

  const shortPassword = response();
  await resetUserPassword(
    { body: { email: "student@example.com", newPassword: "short" } },
    shortPassword,
    (err) => { throw err; }
  );
  assert.equal(shortPassword.statusCode, 400);
});
