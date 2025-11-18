// scripts/showOnlyIndoWestern.js
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const connectDB = require("../config/database");

async function showOnlyIndoWestern() {
  try {
    await connectDB();

    console.log("🚀 Configuring website to show only Indo-Western...\n");

    const indoWesternId = "68b9a4bc025d7ad3a5027633"; // Your Indo-Western category ID

    // Step 1: Hide all categories except Indo-Western
    console.log("📁 Step 1: Hiding categories from navigation...");
    const categoryResult = await Category.updateMany(
      { _id: { $ne: indoWesternId } },
      { $set: { isActive: false } }
    );
    console.log(`   ✅ Hidden ${categoryResult.modifiedCount} categories\n`);

    // Step 2: Ensure Indo-Western category is active
    await Category.findByIdAndUpdate(indoWesternId, { isActive: true });
    console.log("   ✅ Indo-Western category is active\n");

    // Step 3: Hide all products except Indo-Western
    console.log("📦 Step 2: Hiding non-Indo-Western products...");
    const hideResult = await Product.updateMany(
      {
        category: { $ne: new mongoose.Types.ObjectId(indoWesternId) },
        status: "active",
      },
      { $set: { status: "draft" } }
    );

    console.log(`   ✅ Hidden ${hideResult.modifiedCount} products\n`);

    // Step 4: Ensure Indo-Western products are active
    console.log("✨ Step 3: Activating Indo-Western products...");
    const activateResult = await Product.updateMany(
      {
        category: new mongoose.Types.ObjectId(indoWesternId),
        status: { $in: ["draft", "inactive"] },
      },
      { $set: { status: "active" } }
    );

    console.log(`   ✅ Activated ${activateResult.modifiedCount} products\n`);

    // Summary
    console.log("=".repeat(60));
    console.log("✅ CONFIGURATION COMPLETE!\n");

    // Active categories
    const activeCategories = await Category.find({ isActive: true }).select(
      "name"
    );
    console.log("📁 Visible Categories (Navigation & Filters):");
    activeCategories.forEach((cat) => {
      console.log(`   ✓ ${cat.name}`);
    });

    // Hidden categories
    const hiddenCategories = await Category.find({ isActive: false }).select(
      "name"
    );
    console.log(`\n📁 Hidden Categories (${hiddenCategories.length}):`);
    hiddenCategories.forEach((cat) => {
      console.log(`   - ${cat.name}`);
    });

    // Active products
    const activeProducts = await Product.find({
      status: "active",
      category: indoWesternId,
    }).select("name sku");

    console.log(`\n📦 Visible Products (${activeProducts.length}):`);
    activeProducts.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.name} (${product.sku})`);
    });

    // Hidden products count by category
    console.log(`\n📦 Hidden Products:`);
    const hiddenCats = await Category.find({
      _id: { $ne: indoWesternId },
    }).select("name");

    for (const cat of hiddenCats) {
      const count = await Product.countDocuments({
        category: cat._id,
        status: "draft",
      });
      if (count > 0) {
        console.log(`   - ${cat.name}: ${count} products`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("🌐 Your website now shows:");
    console.log("   • Navigation: Only Indo-Western category");
    console.log("   • Filters: All Items + Indo-Western");
    console.log("   • Products: Only Indo-Western items");
    console.log("\n💡 To restore everything later, run:");
    console.log("   node scripts/restoreAllCategories.js\n");

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    mongoose.connection.close();
    process.exit(1);
  }
}

showOnlyIndoWestern();
