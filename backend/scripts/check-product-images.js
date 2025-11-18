// Create file: backend/scripts/simple-check.js
// Run from backend directory: node scripts/simple-check.js

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");

// Product ID to check
const PRODUCT_ID = "68f71284f95fc8324b279110";

async function quickCheck() {
  try {
    // Show what we're working with
    console.log("📁 Script location:", __dirname);
    console.log("📁 .env location:", path.join(__dirname, "..", ".env"));
    console.log("");

    // Check environment - try both MONGO_URI and MONGODB_URI
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!mongoUri) {
      console.error("❌ MongoDB URI not found in environment!");
      console.error(
        "💡 Make sure your .env file exists in the backend directory"
      );
      console.error("💡 And contains either: MONGO_URI or MONGODB_URI");
      process.exit(1);
    }

    console.log("✅ MongoDB URI found");
    console.log(`🔗 Connecting to MongoDB...`);
    console.log("");

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");
    console.log("");

    // Use native MongoDB driver for direct access
    const db = mongoose.connection.db;
    const productsCollection = db.collection("products");

    // Get the specific product
    console.log(`🔍 Looking for product: ${PRODUCT_ID}`);
    const product = await productsCollection.findOne({
      _id: new mongoose.Types.ObjectId(PRODUCT_ID),
    });

    if (!product) {
      console.log("❌ Product not found!");

      // Show all products
      const allProducts = await productsCollection.find({}).limit(5).toArray();
      console.log(
        `\n📦 Found ${allProducts.length} products in database (showing first 5):`
      );
      allProducts.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} (ID: ${p._id})`);
      });
    } else {
      console.log("✅ Product found!");
      console.log("");
      console.log("📊 Product Info:");
      console.log("   Name:", product.name);
      console.log("   SKU:", product.sku);
      console.log("   Brand:", product.brand);
      console.log("   Status:", product.status);
      console.log("");

      console.log("🖼️  Images Status:");
      console.log("   Has images field?", "images" in product);
      console.log(
        "   Images type:",
        Array.isArray(product.images) ? "Array" : typeof product.images
      );
      console.log("   Images count:", product.images?.length || 0);
      console.log("");

      if (product.images && product.images.length > 0) {
        console.log("✅ IMAGES FOUND IN DATABASE:");
        product.images.forEach((img, i) => {
          console.log(`\n   Image ${i + 1}:`);
          console.log("      URL:", img.url);
          console.log("      Public ID:", img.publicId);
          console.log("      Alt:", img.alt || "(empty)");
          console.log("      Primary:", img.isPrimary);
        });
      } else {
        console.log("❌ NO IMAGES IN DATABASE!");
        console.log("");
        console.log("🔍 Raw images field:", product.images);
      }

      console.log("");
      console.log("📋 Full Raw Document:");
      console.log(JSON.stringify(product, null, 2));
    }

    // Check statistics
    console.log("");
    console.log("📊 Database Statistics:");
    const totalProducts = await productsCollection.countDocuments();
    const productsWithImages = await productsCollection.countDocuments({
      images: { $exists: true, $ne: [], $not: { $size: 0 } },
    });

    console.log(`   Total products: ${totalProducts}`);
    console.log(`   Products with images: ${productsWithImages}`);
    console.log(
      `   Products without images: ${totalProducts - productsWithImages}`
    );

    if (productsWithImages > 0) {
      console.log("");
      console.log("✅ Sample products WITH images:");
      const samplesWithImages = await productsCollection
        .find({ images: { $exists: true, $ne: [] } })
        .limit(3)
        .toArray();

      samplesWithImages.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name}`);
        console.log(`      - ${p.images.length} image(s)`);
        console.log(
          `      - First image URL: ${p.images[0]?.url?.substring(0, 60)}...`
        );
      });
    }

    await mongoose.connection.close();
    console.log("");
    console.log("✅ Check complete!");
  } catch (error) {
    console.error("");
    console.error("❌ Error:", error.message);
    console.error("");
    console.error("Stack:", error.stack);
  }
}

quickCheck();
