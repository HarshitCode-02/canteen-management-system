const express = require("express");
const { getMenu, createItem, updateItem, deleteItem } = require("../controllers/menuController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", getMenu); // public

router.use(protect, authorize("canteen", "admin")); // everything below needs canteen/admin
router.post("/", createItem);
router.patch("/:id", updateItem);
router.delete("/:id", deleteItem);

module.exports = router;