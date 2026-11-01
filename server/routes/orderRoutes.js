const express = require("express");
const {
  createOrder,
  getMyOrders,
  getSalesReport,
  getActiveOrders,
  updateStatus,
  cancelOrder,
  verifyAndCollect,
  createPickupQr,
  verifyPickupQr,
  confirmPayment,runningLate,
  resolveNoShow,
} = require("../controllers/orderController");
const { protect, authorize } = require("../middleware/auth");
const { pickupVerifyLimiter } = require("../middleware/authRateLimit");

const router = express.Router();

router.use(protect); // every order route needs login

router.post("/", createOrder);
router.get("/my", getMyOrders);
router.get("/report", authorize("canteen", "admin"), getSalesReport);
router.get("/", authorize("canteen", "admin"), getActiveOrders);
router.post("/verify-qr", authorize("canteen", "admin"), pickupVerifyLimiter, verifyPickupQr);
router.post("/:id/pickup-qr", createPickupQr);
router.patch("/:id/status", authorize("canteen", "admin"), updateStatus);
router.patch("/:id/review-no-show", authorize("canteen", "admin"), resolveNoShow);
router.patch("/:id/cancel", cancelOrder);
router.patch("/:id/late", runningLate);
router.patch("/:id/verify", authorize("canteen", "admin"), pickupVerifyLimiter, verifyAndCollect);
router.patch("/:id/payment", authorize("canteen", "admin"), confirmPayment);


module.exports = router;