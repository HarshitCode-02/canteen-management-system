module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = Number.isInteger(err.status)
    ? err.status
    : err.name === "ValidationError" ? 400 : 500;
  const diagnostic = {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    status,
    errorName: err.name || "Error",
  };
  if (typeof err.code === "string" && /^[A-Z0-9_]{1,40}$/.test(err.code)) {
    diagnostic.errorCode = err.code;
  }
  console.error("Request failed", diagnostic);
  const message = status >= 500
    ? "Something went wrong. Please try again."
    : err.name === "ValidationError"
      ? "Please check the information you entered and try again."
    : err.message || "Something went wrong. Please try again.";
  res.status(status).json({ message });
};
