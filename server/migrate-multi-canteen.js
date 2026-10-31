require("dotenv").config();
const mongoose = require("mongoose");
const Canteen = require("./models/Canteen");
const MenuItem = require("./models/MenuItem");
const Order = require("./models/Order");
const User = require("./models/User");
const Counter = require("./models/Counter");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    // 1. find or create the first canteen
    let canteen = await Canteen.findOne({ slug: "campusbites" });
    if (!canteen) {
      canteen = await Canteen.create({
        name: "CampusBites",
        slug: "campusbites",
        description: "Our first canteen",
        location: "Campus",
      });
      console.log("Created canteen CampusBites");
    } else {
      console.log("CampusBites already exists, reusing it");
    }

    // 2. attach existing data that has no canteen yet
    const menu = await MenuItem.updateMany({ canteen: null }, { $set: { canteen: canteen._id } });
    const orders = await Order.updateMany({ canteen: null }, { $set: { canteen: canteen._id } });
    console.log(`Menu items updated: ${menu.modifiedCount}`);
    console.log(`Orders updated: ${orders.modifiedCount}`);

    // 3. canteen staff manage CampusBites
    const staff = await User.updateMany(
      { role: "canteen" },
      { $addToSet: { managedCanteens: canteen._id } }
    );
    console.log(`Canteen staff updated: ${staff.modifiedCount}`);

    // 4. copy old date-only counters to the new per-canteen keys,
    //    so today's order numbers continue instead of restarting
    const oldCounters = await Counter.find({ _id: /^\d{4}-\d{2}-\d{2}$/ });
    for (const c of oldCounters) {
      await Counter.updateOne(
        { _id: `${canteen._id}:${c._id}` },
        { $max: { seq: c.seq } },
        { upsert: true }
      );
    }
    console.log(`Counters copied: ${oldCounters.length}`);

    console.log("Migration done");
  } catch (err) {
    console.error("Migration failed:", err.message);
  } finally {
    await mongoose.disconnect();
  }
})();