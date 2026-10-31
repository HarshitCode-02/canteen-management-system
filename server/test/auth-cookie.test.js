const assert = require("node:assert/strict");
const test = require("node:test");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { AUTH_COOKIE_NAME, authCookieOptions, readAuthCookie } = require("../middleware/authCookie");
const csrfOrigin = require("../middleware/csrfOrigin");
const { protect } = require("../middleware/auth");
const { login, logout } = require("../controllers/authController");

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

test("auth cookie is HttpOnly, secure, and cross-site only in production", (t) => {
  const originalNodeEnv = process.env.NODE_ENV;
  t.after(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  process.env.NODE_ENV = "production";
  assert.deepEqual(authCookieOptions(), {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 604800000,
  });

  process.env.NODE_ENV = "development";
  assert.equal(authCookieOptions().secure, false);
  assert.equal(authCookieOptions().sameSite, "lax");

  delete process.env.NODE_ENV;
  assert.equal(authCookieOptions().secure, true);
  assert.equal(authCookieOptions().sameSite, "none");
});

test("reads only the auth cookie and safely decodes its value", () => {
  const token = "header.payload.signature";
  const req = {
    headers: {
      cookie: `other=value; ${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
      authorization: "Bearer ignored",
    },
  };
  assert.equal(readAuthCookie(req), token);
  assert.equal(readAuthCookie({ headers: { authorization: "Bearer ignored" } }), null);
});

test("protect authenticates the HttpOnly cookie and ignores bearer headers", async (t) => {
  const originalSecret = process.env.JWT_SECRET;
  const originalFindById = User.findById;
  t.after(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    User.findById = originalFindById;
  });

  process.env.JWT_SECRET = crypto.randomBytes(32).toString("hex");
  const user = { _id: "test-user", role: "student", tokenVersion: 0 };
  User.findById = () => ({ select: async () => user });
  const token = jwt.sign(
    { id: user._id, tokenVersion: 0 },
    process.env.JWT_SECRET,
    { expiresIn: "1m", algorithm: "HS256" }
  );
  const req = { headers: { cookie: `${AUTH_COOKIE_NAME}=${token}` } };
  const res = response();
  let nextCalled = false;

  await protect(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.user, user);

  const bearerOnlyResponse = response();
  await protect(
    { headers: { authorization: `Bearer ${token}` } },
    bearerOnlyResponse,
    () => assert.fail("Bearer token must not authenticate")
  );
  assert.equal(bearerOnlyResponse.statusCode, 401);
});

test("login sets an HttpOnly cookie instead of returning a token", async (t) => {
  const originalSecret = process.env.JWT_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFindOne = User.findOne;
  t.after(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    User.findOne = originalFindOne;
  });

  process.env.JWT_SECRET = crypto.randomBytes(32).toString("hex");
  process.env.NODE_ENV = "production";
  const user = {
    _id: "test-user",
    role: "student",
    tokenVersion: 0,
    passwordHash: await bcrypt.hash("valid-password", 4),
    toJSON() {
      return { _id: this._id, role: this.role };
    },
  };
  User.findOne = () => ({ select: async () => user });

  const res = {
    cookie(name, value, options) {
      this.cookieData = { name, value, options };
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  await login({ body: { email: "STUDENT@example.com", password: "valid-password" } }, res, (err) => {
    throw err;
  });

  assert.equal(res.cookieData.name, AUTH_COOKIE_NAME);
  assert.equal(res.cookieData.options.httpOnly, true);
  assert.equal(res.cookieData.options.secure, true);
  assert.equal(Object.hasOwn(res.body, "token"), false);
  assert.equal(Object.hasOwn(JSON.parse(JSON.stringify(res.body)).user, "passwordHash"), false);

  const logoutResponse = {
    clearCookie(name, options) {
      this.cleared = { name, options };
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  logout({}, logoutResponse);
  assert.equal(logoutResponse.cleared.name, AUTH_COOKIE_NAME);
  assert.equal(logoutResponse.cleared.options.httpOnly, true);
});

test("unsafe requests require an explicitly allowed Origin", (t) => {
  const originalClientUrl = process.env.CLIENT_URL;
  t.after(() => {
    if (originalClientUrl === undefined) delete process.env.CLIENT_URL;
    else process.env.CLIENT_URL = originalClientUrl;
  });
  process.env.CLIENT_URL = "https://canteen.example, https://admin.example";

  let nextCalled = false;
  csrfOrigin({
    method: "PATCH",
    get: () => "https://canteen.example",
  }, response(), () => { nextCalled = true; });
  assert.equal(nextCalled, true);

  const denied = response();
  csrfOrigin({ method: "POST", get: () => "https://attacker.example" }, denied, () => {
    assert.fail("Unlisted origin must be rejected");
  });
  assert.equal(denied.statusCode, 403);

  let safeRequestPassed = false;
  csrfOrigin({ method: "GET", get: () => undefined }, response(), () => {
    safeRequestPassed = true;
  });
  assert.equal(safeRequestPassed, true);
});
