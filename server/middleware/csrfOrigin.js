const { getAllowedOrigins } = require("../allowedOrigins");

module.exports = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const origin = req.get("origin");
  if (!origin || !getAllowedOrigins().includes(origin)) {
    return res.status(403).json({ message: "Request origin is not allowed" });
  }
  next();
};
