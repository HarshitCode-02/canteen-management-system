const express = require("express");
const {
  getCanteens,
  getCanteen,
  getCanteenMenu,
  createCanteen,
  updateCanteen,
} = require("../controllers/canteenController");
const { getBlockedUsers, unblockUser } = require("../controllers/canteenController");
const { getSlots } = require("../controllers/canteenController");
const { setOpen } = require("../controllers/canteenController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", getCanteens); // public
router.get("/:id", getCanteen); // public
router.get("/:id/menu", getCanteenMenu); // public
router.get("/:id/slots", getSlots); // public

router.post("/", protect, authorize("admin"), createCanteen);
router.patch("/:id/open", protect, authorize("canteen", "admin"), setOpen);
router.patch("/:id", protect, authorize("admin"), updateCanteen);
router.get("/:id/blocked", protect, authorize("canteen", "admin"), getBlockedUsers);
router.patch("/:id/unblock/:userId", protect, authorize("canteen", "admin"), unblockUser);

module.exports = router;