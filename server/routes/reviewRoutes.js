const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const { createReview, getMenuItemReviews, getMyReviews } = require("../controllers/reviewController");

const router = express.Router();

router.get("/menu/:menuItemId", getMenuItemReviews);
router.get("/my", protect, authorize("student", "teacher"), getMyReviews);
router.post("/", protect, authorize("student", "teacher"), createReview);

module.exports = router;
