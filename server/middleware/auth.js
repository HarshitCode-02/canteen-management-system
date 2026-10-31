const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { readAuthCookie } = require("./authCookie");

// Requires a valid HttpOnly auth cookie.
exports.protect = async (req, res, next) => {
  try {
    const token = readAuthCookie(req);
    if (!token) {
      return res.status(401).json({ message: "Not authorized, token missing" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    } catch {
      return res.status(401).json({ message: "Not authorized, token invalid or expired" });
    }

    const user = await User.findById(decoded.id).select("+tokenVersion");
    if (!user) return res.status(401).json({ message: "User no longer exists" });
    if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      return res.status(401).json({ message: "Password changed; please sign in again" });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// Usage: authorize("canteen", "admin")
exports.authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "You do not have permission to do this" });
  }
  next();
};

// Can this user manage this canteen? Admin: always. Canteen staff: only their own.
exports.canManageCanteen = (user, canteenId) => {
  if (!user || !canteenId) return false;
  if (user.role === "admin") return true;
  return (user.managedCanteens || []).some((id) => String(id) === String(canteenId));
};