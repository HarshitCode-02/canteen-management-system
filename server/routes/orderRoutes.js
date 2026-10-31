const express = require("express");
const {
  createOrder,
  getMyOrders,
  getSalesReport,
  getActiveOrders,
  updateStatus,
  cancelOrder,
  verifyAndCollect,
  confirmPayment,runningLate,
} = require("../controllers/orderController");
const { protect, authorize } = require("../middleware/auth");
const { pickupVerifyLimiter } = require("../middleware/authRateLimit");

const router = express.Router();

router.use(protect); // every order route needs login

router.post("/", createOrder);
router.get("/my", getMyOrders);
router.get("/report", authorize("canteen", "admin"), getSalesReport);
router.get("/", authorize("canteen", "admin"), getActiveOrders);
router.patch("/:id/status", authorize("canteen", "admin"), updateStatus);
router.patch("/:id/cancel", cancelOrder);
router.patch("/:id/late", runningLate);
router.patch("/:id/verify", authorize("canteen", "admin"), pickupVerifyLimiter, verifyAndCollect);
router.patch("/:id/payment", authorize("canteen", "admin"), confirmPayment);


module.exports = router;