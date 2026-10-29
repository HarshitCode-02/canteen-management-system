const express = require("express");
const { createStaff, assignCanteens } = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect, authorize("admin"));
router.post("/staff", createStaff);
router.patch("/users/:id/canteens", assignCanteens);

module.exports = router;