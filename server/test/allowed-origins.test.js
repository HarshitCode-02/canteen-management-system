const assert = require("node:assert/strict");
const test = require("node:test");
const { getAllowedOrigins } = require("../allowedOrigins");

test("combines configured browser origins with the Render service origin", (t) => {
  const originalClientUrl = process.env.CLIENT_URL;
  const originalRenderUrl = process.env.RENDER_EXTERNAL_URL;
  t.after(() => {
    if (originalClientUrl === undefined) delete process.env.CLIENT_URL;
    else process.env.CLIENT_URL = originalClientUrl;
    if (originalRenderUrl === undefined) delete process.env.RENDER_EXTERNAL_URL;
    else process.env.RENDER_EXTERNAL_URL = originalRenderUrl;
  });

  process.env.CLIENT_URL = "https://staff.example, https://canteen.example";
  process.env.RENDER_EXTERNAL_URL = "https://canteen-app.onrender.com";
  assert.deepEqual(getAllowedOrigins(), [
    "https://staff.example",
    "https://canteen.example",
    "https://canteen-app.onrender.com",
  ]);
});

test("uses the Render origin when no separate client origin is configured", (t) => {
  const originalClientUrl = process.env.CLIENT_URL;
  const originalRenderUrl = process.env.RENDER_EXTERNAL_URL;
  t.after(() => {
    if (originalClientUrl === undefined) delete process.env.CLIENT_URL;
    else process.env.CLIENT_URL = originalClientUrl;
    if (originalRenderUrl === undefined) delete process.env.RENDER_EXTERNAL_URL;
    else process.env.RENDER_EXTERNAL_URL = originalRenderUrl;
  });

  delete process.env.CLIENT_URL;
  process.env.RENDER_EXTERNAL_URL = "https://canteen-app.onrender.com";
  assert.deepEqual(getAllowedOrigins(), ["https://canteen-app.onrender.com"]);
});
