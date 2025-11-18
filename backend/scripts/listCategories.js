// scripts/listCategories.js
require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("../models/Category");
const Product = require("../models/Product");
const connectDB = require("../config/database");

async function listCategories() {
  try {
    await connectDB();

    console.log("📋 All Categories:\n");

    const categories = await Category.find({}).sort({ name: 1 });

    for (const cat of categories) {
      const productCount = await Product.countDocuments({ category: cat._id });
      const activeCount = await Product.countDocuments({
        category: cat._id,
        status: "active",
      });

      console.log(`${cat.name}`);
      console.log(`   ID: ${cat._id}`);
      console.log(`   Products: ${activeCount} active / ${productCount} total`);
      console.log(`   Active: ${cat.isActive ? "Yes" : "No"}\n`);
    }

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    mongoose.connection.close();
    process.exit(1);
  }
}

listCategories();
