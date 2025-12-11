// fixUserAnalytics.js
// This script recalculates totalOrders and totalSpent for all users based on their actual orders

const mongoose = require("mongoose");
require("dotenv").config();

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Define schemas (we need these to query the data)
const userSchema = new mongoose.Schema({}, { strict: false });
const orderSchema = new mongoose.Schema({}, { strict: false });

const User = mongoose.model("User", userSchema, "users");
const Order = mongoose.model("Order", orderSchema, "orders");

const fixUserAnalytics = async () => {
  try {
    console.log("🔧 Starting user analytics fix...\n");

    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users\n`);

    for (const user of users) {
      console.log(
        `Processing user: ${user.firstName} ${user.lastName} (${user.email})`
      );

      // Calculate actual totals from orders
      const orders = await Order.find({
        user: user._id,
        status: { $nin: ["cancelled"] }, // Exclude cancelled orders
      });

      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);

      console.log(`  - Found ${totalOrders} orders`);
      console.log(`  - Total spent: ₹${totalSpent.toFixed(2)}`);
      console.log(
        `  - Current DB values: ${user.totalOrders} orders, ₹${user.totalSpent} spent`
      );

      // Update user document
      await User.findByIdAndUpdate(user._id, {
        totalOrders,
        totalSpent,
      });

      console.log("  ✅ Updated!\n");
    }

    console.log("✨ All user analytics fixed successfully!");
  } catch (error) {
    console.error("❌ Error fixing user analytics:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
};

// Run the script
(async () => {
  await connectDB();
  await fixUserAnalytics();
  process.exit(0);
})();
