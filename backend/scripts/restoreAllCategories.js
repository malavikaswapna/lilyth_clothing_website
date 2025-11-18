// scripts/restoreAllCategories.js
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const connectDB = require("../config/database");

async function restoreAllCategories() {
  try {
    await connectDB();

    console.log("🔄 Restoring all categories and products...\n");

    // Restore all categories
    const categoryResult = await Category.updateMany(
      { isActive: false },
      { $set: { isActive: true } }
    );
    console.log(`✅ Restored ${categoryResult.modifiedCount} categories`);

    // Restore all products
    const productResult = await Product.updateMany(
      { status: "draft" },
      { $set: { status: "active" } }
    );
    console.log(`✅ Restored ${productResult.modifiedCount} products`);

    // Summary
    const totalCategories = await Category.countDocuments({ isActive: true });
    const totalProducts = await Product.countDocuments({ status: "active" });

    console.log(`\n📊 Final Count:`);
    console.log(`   Active Categories: ${totalCategories}`);
    console.log(`   Active Products: ${totalProducts}\n`);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    mongoose.connection.close();
    process.exit(1);
  }
}

restoreAllCategories();
