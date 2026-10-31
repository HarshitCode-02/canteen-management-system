const express = require("express");
const {
  createStaff,
  assignCanteens,
  getAdminOverview,
  unblockUser,
  resetStaffPassword,
  resetUserPassword,
} = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect, authorize("admin"));
router.get("/overview", getAdminOverview);
router.post("/staff", createStaff);
router.patch("/users/:id/canteens", assignCanteens);
router.patch("/users/:id/unblock", unblockUser);
router.patch("/users/password", resetUserPassword);
router.patch("/users/:id/password", resetStaffPassword);

module.exports = router;