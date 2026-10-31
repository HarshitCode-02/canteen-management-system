const express = require("express");
const { register, login, logout, me, updateProfile, changePassword } = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { registerLimiter, loginLimiter } = require("../middleware/authRateLimit");

const router = express.Router();

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.get("/me", protect, me);
router.patch("/me", protect, updateProfile);
router.patch("/password", protect, changePassword);

module.exports = router;