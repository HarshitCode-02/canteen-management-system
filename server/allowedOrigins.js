const getAllowedOrigins = () => {
  const configuredOrigins = (process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const renderOrigin = process.env.RENDER_EXTERNAL_URL?.trim();
  if (renderOrigin) configuredOrigins.push(renderOrigin);
  for (const name of ["VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"]) {
    const host = process.env[name]?.trim();
    if (host) configuredOrigins.push(/^https?:\/\//i.test(host) ? new URL(host).origin : `https://${host}`);
  }
  return [...new Set(configuredOrigins)];
};

const isAllowedOrigin = (origin, req) => {
  if (getAllowedOrigins().includes(origin)) return true;
  const host = req?.get?.("host");
  return Boolean(host && origin === `${req.protocol}://${host}`);
};

const isAllowedSocketOrigin = (origin, request) => {
  if (!origin || !request?.headers) return false;
  const forwardedProtocol = request.headers["x-forwarded-proto"]
    ?.split(",")[0]
    .trim()
    .toLowerCase();
  const protocol = ["http", "https"].includes(forwardedProtocol)
    ? forwardedProtocol
    : request.socket?.encrypted ? "https" : "http";
  return isAllowedOrigin(origin, {
    protocol,
    get: (name) => request.headers[name],
  });
};

module.exports = { getAllowedOrigins, isAllowedOrigin, isAllowedSocketOrigin };
