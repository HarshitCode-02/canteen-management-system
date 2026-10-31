module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = Number.isInteger(err.status) ? err.status : 500;
  console.error("Request failed", {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    status,
    errorName: err.name || "Error",
  });
  const message = process.env.NODE_ENV === "production" && status >= 500
    ? "Server error"
    : err.message || "Server error";
  res.status(status).json({ message });
};
