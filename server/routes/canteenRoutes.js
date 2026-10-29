const express = require("express");
const {
  getCanteens,
  getCanteen,
  getCanteenMenu,
  createCanteen,
  updateCanteen,
} = require("../controllers/canteenController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", getCanteens); // public
router.get("/:id", getCanteen); // public
router.get("/:id/menu", getCanteenMenu); // public

router.post("/", protect, authorize("admin"), createCanteen);
router.patch("/:id", protect, authorize("admin"), updateCanteen);

module.exports = router;