const assert = require("node:assert/strict");
const test = require("node:test");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { updateProfile } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

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

const makeUser = async () => ({
  _id: "507f1f77bcf86cd799439011",
  name: "Student",
  email: "student@example.com",
  phone: "9876543210",
  passwordHash: await bcrypt.hash("current-password", 4),
  role: "student",
  isBlocked: false,
  async save() {},
});

const stubUser = (t, user) => {
  const originalFindById = User.findById;
  User.findById = () => ({ select: async () => user });
  t.after(() => {
    User.findById = originalFindById;
  });
};

test("user can update their own name and phone", async (t) => {
  const user = await makeUser();
  stubUser(t, user);
  const res = response();

  await updateProfile(
    { user, body: { name: "  Alex Student  ", phone: "9123456789" } },
    res,
    (err) => { throw err; }
  );

  assert.equal(user.name, "Alex Student");
  assert.equal(user.phone, "9123456789");
  assert.equal(res.body.user.name, "Alex Student");
});

test("role and blocked status in the request are ignored", async (t) => {
  const user = await makeUser();
  stubUser(t, user);
  const res = response();

  await updateProfile(
    { user, body: { name: "Updated Student", role: "admin", isBlocked: true } },
    res,
    (err) => { throw err; }
  );

  assert.equal(user.role, "student");
  assert.equal(user.isBlocked, false);
  assert.equal(res.statusCode, 200);
});

test("email change requires the correct current password", async (t) => {
  const user = await makeUser();
  stubUser(t, user);
  const originalFindOne = User.findOne;
  User.findOne = async () => null;
  t.after(() => {
    User.findOne = originalFindOne;
  });

  const incorrect = response();
  await updateProfile(
    { user, body: { email: "new@example.com", currentPassword: "wrong-password" } },
    incorrect,
    (err) => { throw err; }
  );
  assert.equal(incorrect.statusCode, 400);
  assert.equal(user.email, "student@example.com");

  const correct = response();
  await updateProfile(
    { user, body: { email: " New@Example.com ", currentPassword: "current-password" } },
    correct,
    (err) => { throw err; }
  );
  assert.equal(correct.statusCode, 200);
  assert.equal(user.email, "new@example.com");
});

test("duplicate email returns 409", async (t) => {
  const user = await makeUser();
  stubUser(t, user);
  const originalFindOne = User.findOne;
  User.findOne = async () => ({ _id: "another-user" });
  t.after(() => {
    User.findOne = originalFindOne;
  });
  const res = response();

  await updateProfile(
    { user, body: { email: "taken@example.com", currentPassword: "current-password" } },
    res,
    (err) => { throw err; }
  );

  assert.equal(res.statusCode, 409);
  assert.equal(user.email, "student@example.com");
});

test("invalid phone returns 400", async (t) => {
  const user = await makeUser();
  stubUser(t, user);
  const res = response();

  await updateProfile(
    { user, body: { phone: "12345" } },
    res,
    (err) => { throw err; }
  );

  assert.equal(res.statusCode, 400);
});

test("missing auth cookie returns 401", async () => {
  const res = response();
  await protect({ headers: {} }, res, (err) => { throw err; });
  assert.equal(res.statusCode, 401);
});
