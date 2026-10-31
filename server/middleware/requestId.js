const { randomUUID } = require("node:crypto");

module.exports = (req, res, next) => {
  req.requestId = randomUUID();
  res.set("X-Request-ID", req.requestId);
  next();
};
