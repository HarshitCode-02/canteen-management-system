const assert = require("node:assert/strict");
const test = require("node:test");
const { getAllowedOrigins, isAllowedSocketOrigin } = require("../allowedOrigins");

test("combines configured browser origins with the Render service origin", (t) => {
  const originalEnvironment = Object.fromEntries(
    ["CLIENT_URL", "RENDER_EXTERNAL_URL", "VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"]
      .map((name) => [name, process.env[name]])
  );
  t.after(() => {
    for (const [name, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  for (const name of Object.keys(originalEnvironment)) delete process.env[name];
  process.env.CLIENT_URL = "https://staff.example, https://canteen.example";
  process.env.RENDER_EXTERNAL_URL = "https://canteen-app.onrender.com";
  assert.deepEqual(getAllowedOrigins(), [
    "https://staff.example",
    "https://canteen.example",
    "https://canteen-app.onrender.com",
  ]);
});

test("uses the Render origin when no separate client origin is configured", (t) => {
  const names = ["CLIENT_URL", "RENDER_EXTERNAL_URL", "VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"];
  const originalEnvironment = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  t.after(() => {
    for (const [name, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  for (const name of names) delete process.env[name];
  process.env.RENDER_EXTERNAL_URL = "https://canteen-app.onrender.com";
  assert.deepEqual(getAllowedOrigins(), ["https://canteen-app.onrender.com"]);
});

test("adds Vercel deployment host origins", (t) => {
  const originalVercelUrl = process.env.VERCEL_URL;
  t.after(() => {
    if (originalVercelUrl === undefined) delete process.env.VERCEL_URL;
    else process.env.VERCEL_URL = originalVercelUrl;
  });

  process.env.VERCEL_URL = "canteen-app.vercel.app";
  assert.ok(getAllowedOrigins().includes("https://canteen-app.vercel.app"));
});

test("allows same-origin requests for custom Vercel domains", () => {
  const req = {
    protocol: "https",
    get: (name) => (name === "host" ? "canteen.example" : undefined),
  };
  const { isAllowedOrigin } = require("../allowedOrigins");

  assert.equal(isAllowedOrigin("https://canteen.example", req), true);
  assert.equal(isAllowedOrigin("https://attacker.example", req), false);
});

test("allows only configured or same-origin Socket.IO handshakes", (t) => {
  const originalEnvironment = Object.fromEntries(
    ["CLIENT_URL", "RENDER_EXTERNAL_URL", "VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"]
      .map((name) => [name, process.env[name]])
  );
  t.after(() => {
    for (const [name, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  for (const name of Object.keys(originalEnvironment)) delete process.env[name];
  process.env.CLIENT_URL = "https://campusbites.example";
  const request = (host, forwardedProtocol = "https") => ({
    headers: { host, "x-forwarded-proto": forwardedProtocol },
  });

  assert.equal(isAllowedSocketOrigin("https://campusbites.example", request("api.example")), true);
  assert.equal(isAllowedSocketOrigin("https://api.example", request("api.example")), true);
  assert.equal(isAllowedSocketOrigin("https://attacker.example", request("api.example")), false);
  assert.equal(isAllowedSocketOrigin(undefined, request("api.example")), false);
});

test("uses the transport scheme when the proxy protocol is invalid", (t) => {
  const originalClientUrl = process.env.CLIENT_URL;
  t.after(() => {
    if (originalClientUrl === undefined) delete process.env.CLIENT_URL;
    else process.env.CLIENT_URL = originalClientUrl;
  });

  process.env.CLIENT_URL = "https://campusbites.example";
  const request = {
    headers: { host: "api.example", "x-forwarded-proto": "javascript" },
    socket: { encrypted: true },
  };
  assert.equal(isAllowedSocketOrigin("https://api.example", request), true);
  assert.equal(isAllowedSocketOrigin("http://api.example", request), false);
});
