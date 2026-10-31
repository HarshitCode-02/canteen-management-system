require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

(async () => {
  try {
    const email = (process.argv[2] || "").toLowerCase().trim();
    if (!email) throw new Error("Usage: node makeAdmin.js harshitkushwaha034@gmail.com");
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOneAndUpdate({ email }, { role: "admin" }, { returnDocument: "after" });
    console.log(user ? `${user.email} is now an admin` : "No user with that email. Register first.");
  } catch (err) {
    console.error(err.message);
  } finally {
    await mongoose.disconnect();
  }
})();