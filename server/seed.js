require("dotenv").config();
const mongoose = require("mongoose");
const MenuItem = require("./models/MenuItem");

const items = [
  { name: "Samosa", price: 15, category: "Snacks", prepTimeMins: 5 },
  { name: "Veg Sandwich", price: 40, category: "Snacks", prepTimeMins: 8 },
  { name: "Chole Bhature", price: 60, category: "Meals", prepTimeMins: 12 },
  { name: "Veg Thali", price: 80, category: "Meals", prepTimeMins: 10 },
  { name: "Masala Chai", price: 10, category: "Beverages", prepTimeMins: 3 },
  { name: "Cold Coffee", price: 35, category: "Beverages", prepTimeMins: 5 },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await MenuItem.deleteMany({});
    const created = await MenuItem.insertMany(items);
    console.log(`Seeded ${created.length} menu items`);
  } catch (err) {
    console.error("Seed failed:", err.message);
  } finally {
    await mongoose.disconnect();
  }
})();
