const { randomUUID } = require("node:crypto");

module.exports = (req, res, next) => {
  req.requestId = randomUUID();
  res.set("X-Request-ID", req.requestId);
  const startedAt = process.hrtime.bigint();
  res.on("finish", () => {
    console.info(JSON.stringify({
      event: "http.request.completed",
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Math.round(Number(process.hrtime.bigint() - startedAt) / 1e6),
      ...(Number.isFinite(req.dbWaitMs) ? { dbWaitMs: Math.round(req.dbWaitMs) } : {}),
    }));
  });
  next();
};
