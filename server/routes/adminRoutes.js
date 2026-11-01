const express = require("express");
const {
  createStaff,
  assignCanteens,
  getAdminOverview,
  unblockUser,
  reviewBlockedUser,
  resetStaffPassword,
  resetUserPassword,
} = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/auth");
const { listAdminReviews, moderateReview } = require("../controllers/reviewController");
const { listAuditLogs } = require("../controllers/auditController");

const router = express.Router();

router.use(protect, authorize("admin"));
router.get("/overview", getAdminOverview);
router.post("/staff", createStaff);
router.patch("/users/:id/canteens", assignCanteens);
router.patch("/users/:id/unblock", unblockUser);
router.patch("/users/:id/review", reviewBlockedUser);
router.patch("/users/password", resetUserPassword);
router.patch("/users/:id/password", resetStaffPassword);
router.get("/reviews", listAdminReviews);
router.patch("/reviews/:id/moderation", moderateReview);
router.get("/audit-logs", listAuditLogs);

module.exports = router;