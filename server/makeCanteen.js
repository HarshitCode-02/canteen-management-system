require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

const [email, role = "canteen"] = process.argv.slice(2);

(async () => {
  try {
    if (!email) throw new Error("Usage: node makeCanteen.js <email> [canteen|admin]");
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { role },
      { new: true }
    );
    console.log(user ? `${user.email} is now ${user.role}` : "No user with that email");
  } catch (err) {
    console.error(err.message);
  } finally {
    await mongoose.disconnect();
  }
})();