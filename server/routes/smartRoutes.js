const express = require("express");
const { assist, suggestMeals } = require("../controllers/smartController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect, authorize("student", "teacher"));
router.post("/meal-suggestions", suggestMeals);
router.post("/assistant", assist);

module.exports = router;
