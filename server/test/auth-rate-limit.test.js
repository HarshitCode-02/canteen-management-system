const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const authRoutes = require("../routes/authRoutes");

const startAuthServer = async (t) => {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  }));
  return `http://127.0.0.1:${server.address().port}/api/auth`;
};

const post = (url, forwardedFor) =>
  fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": forwardedFor,
    },
    body: "{}",
  });

test("login is limited to 10 attempts per IP per 15 minutes", async (t) => {
  const baseUrl = await startAuthServer(t);
  let response;
  for (let attempt = 0; attempt < 11; attempt += 1) {
    response = await post(`${baseUrl}/login`, "198.51.100.10");
  }
  assert.equal(response.status, 429);
  assert.match(response.headers.get("ratelimit-limit"), /10/);
  assert.deepEqual(await response.json(), {
    message: "Too many login attempts. Try again later.",
  });
});

test("registration is limited to 5 attempts per IP per hour", async (t) => {
  const baseUrl = await startAuthServer(t);
  let response;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    response = await post(`${baseUrl}/register`, "198.51.100.20");
  }
  assert.equal(response.status, 429);
  assert.match(response.headers.get("ratelimit-limit"), /5/);
  assert.deepEqual(await response.json(), {
    message: "Too many registration attempts. Try again later.",
  });
});
