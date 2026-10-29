const express = require("express");
const {
  createOrder,
  getMyOrders,
  getActiveOrders,
  updateStatus,
  cancelOrder,
  verifyAndCollect,
  confirmPayment,
} = require("../controllers/orderController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect); // every order route needs login

router.post("/", createOrder);
router.get("/my", getMyOrders);
router.get("/", authorize("canteen", "admin"), getActiveOrders);
router.patch("/:id/status", authorize("canteen", "admin"), updateStatus);
router.patch("/:id/cancel", cancelOrder);
router.patch("/:id/verify", authorize("canteen", "admin"), verifyAndCollect);
router.patch("/:id/payment", authorize("canteen", "admin"), confirmPayment);

module.exports = router;