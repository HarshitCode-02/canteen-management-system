require("dotenv").config();
const mongoose = require("mongoose");
const Canteen = require("./models/Canteen");
const MenuItem = require("./models/MenuItem");

// Placeholder test data. Replace with real menus later.
const data = [
  {
    name: "Chhoti Canteen", slug: "chhoti-canteen", location: "Near Main Gate",
    description: "Quick snacks and chai",
    items: [
      { name: "Samosa", price: 15, category: "Snacks", prepTimeMins: 5 },
      { name: "Bread Pakora", price: 20, category: "Snacks", prepTimeMins: 6 },
      { name: "Masala Chai", price: 10, category: "Beverages", prepTimeMins: 3 },
    ],
  },
  {
    name: "Nescafe", slug: "nescafe", location: "Library Block",
    description: "Coffee and light bites",
    items: [
      { name: "Hot Coffee", price: 30, category: "Beverages", prepTimeMins: 4 },
      { name: "Cold Coffee", price: 50, category: "Beverages", prepTimeMins: 5 },
      { name: "Veg Sandwich", price: 45, category: "Snacks", prepTimeMins: 8 },
    ],
  },
  {
    name: "Dominos", slug: "dominos", location: "Food Court",
    description: "Pizza and sides",
    items: [
      { name: "Margherita Pizza", price: 99, category: "Meals", prepTimeMins: 15 },
      { name: "Garlic Bread", price: 79, category: "Snacks", prepTimeMins: 10 },
      { name: "Choco Lava Cake", price: 99, category: "Desserts", prepTimeMins: 8 },
    ],
  },
  {
    name: "Burger Singh", slug: "burger-singh", location: "Food Court",
    description: "Burgers and fries",
    items: [
      { name: "Aloo Tikki Burger", price: 69, category: "Meals", prepTimeMins: 10 },
      { name: "French Fries", price: 59, category: "Snacks", prepTimeMins: 7 },
      { name: "Cold Drink", price: 30, category: "Beverages", prepTimeMins: 1 },
    ],
  },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    for (const { items, ...info } of data) {
      const canteen = await Canteen.findOneAndUpdate(
        { slug: info.slug },
        { $set: info },
        { upsert: true, returnDocument: "after" }
      );
      await MenuItem.deleteMany({ canteen: canteen._id }); // only this canteen's items
      await MenuItem.insertMany(items.map((i) => ({ ...i, canteen: canteen._id })));
      console.log(`Seeded ${canteen.name}: ${items.length} items`);
    }
  } catch (err) {
    console.error("Seed failed:", err.message);
  } finally {
    await mongoose.disconnect();
  }
})();