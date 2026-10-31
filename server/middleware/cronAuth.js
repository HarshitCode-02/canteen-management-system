const crypto = require("node:crypto");

module.exports = (req, res, next) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(503).json({ message: "Scheduled job is not configured" });
  }

  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(req.get("authorization") || "");
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return res.status(401).json({ message: "Not authorized" });
  }

  next();
};
