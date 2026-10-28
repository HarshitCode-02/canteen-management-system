const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Requires a valid "Authorization: Bearer <jwt>" header
exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, token missing" });
    }
    const token = header.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Not authorized, token invalid or expired" });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "User no longer exists" });

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