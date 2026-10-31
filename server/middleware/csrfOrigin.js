const { isAllowedOrigin } = require("../allowedOrigins");

module.exports = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const origin = req.get("origin");
  if (!origin || !isAllowedOrigin(origin, req)) {
    return res.status(403).json({ message: "Request origin is not allowed" });
  }
  next();
};
