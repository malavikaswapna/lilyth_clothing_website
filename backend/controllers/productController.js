// controllers/productController.js
const Product = require("../models/Product");
const Category = require("../models/Category");
const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const {
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
} = require("../config/cloudinary");

// Helper function to add no-cache headers
const addNoCacheHeaders = (res) => {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "Surrogate-Control": "no-store",
  });
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = asyncHandler(async (req, res) => {
  // Add no-cache headers
  addNoCacheHeaders(res);

  // Build query
  let query = {};

  // For admin users, allow filtering by any status
  // For public users, only show active products
  if (req.user && req.user.role === "admin") {
    // Admin can filter by specific status or see all
    if (req.query.status) {
      query.status = req.query.status;
    }
    // If no status specified, show all statuses for admin
  } else {
    // Public users only see active products
    query.status = "active";
  }

  // Category filter - handle both slug and ID
  if (req.query.category) {
    try {
      // First try to find category by slug
      const category = await Category.findOne({
        slug: req.query.category,
        isActive: true,
      });

      if (category) {
        query.category = category._id;
      } else {
        // If not found by slug, try as ObjectId (but validate first)
        if (mongoose.Types.ObjectId.isValid(req.query.category)) {
          query.category = req.query.category;
        } else {
          // Invalid category - return empty results
          return res.status(200).json({
            success: true,
            count: 0,
            total: 0,
            pagination: {
              page: 1,
              pages: 0,
              limit: 12,
              hasNext: false,
              hasPrev: false,
            },
            products: [],
          });
        }
      }
    } catch (error) {
      console.error("Category lookup error:", error);
      return res.status(200).json({
        success: true,
        count: 0,
        total: 0,
        pagination: {
          page: 1,
          pages: 0,
          limit: 12,
          hasNext: false,
          hasPrev: false,
        },
        products: [],
      });
    }
  }

  // Brand filter
  if (req.query.brand) {
    query.brand = new RegExp(req.query.brand, "i");
  }

  // Size filter
  if (req.query.size) {
    query["variants.size"] = req.query.size;
  }

  // Color filter
  if (req.query.color) {
    query["variants.color.name"] = new RegExp(req.query.color, "i");
  }

  // Price range filter
  if (req.query.minPrice || req.query.maxPrice) {
    query.price = {};
    if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice);
    if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
  }

  // Search by name, description, or tags
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { description: { $regex: req.query.search, $options: "i" } },
      { shortDescription: { $regex: req.query.search, $options: "i" } },
      { tags: { $in: [new RegExp(req.query.search, "i")] } },
    ];
  }

  // Featured products only
  if (req.query.featured === "true") {
    query.isFeatured = true;
  }

  // New arrivals only
  if (req.query.newArrivals === "true") {
    query.isNewArrival = true;
  }

  // On sale only
  if (req.query.onSale === "true") {
    query.salePrice = { $exists: true, $ne: null };
  }

  // Low stock filter (admin only)
  if (req.query.lowStock === "true") {
    query.totalStock = { $lt: 10 };
  }

  // Date range filter
  if (req.query.startDate || req.query.endDate) {
    query.createdAt = {};
    if (req.query.startDate) {
      query.createdAt.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      // Add 1 day to include the entire end date
      const endDate = new Date(req.query.endDate);
      endDate.setDate(endDate.getDate() + 1);
      query.createdAt.$lt = endDate;
    }
  }

  console.log("Final query:", JSON.stringify(query, null, 2));

  // Create the mongoose query
  let mongooseQuery = Product.find(query);

  // Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort;
    switch (sortBy) {
      case "price_low":
        mongooseQuery = mongooseQuery.sort({ price: 1 });
        break;
      case "price_high":
        mongooseQuery = mongooseQuery.sort({ price: -1 });
        break;
      case "newest":
        mongooseQuery = mongooseQuery.sort({ createdAt: -1 });
        break;
      case "oldest":
        mongooseQuery = mongooseQuery.sort({ createdAt: 1 });
        break;
      case "popular":
        mongooseQuery = mongooseQuery.sort({ purchases: -1 });
        break;
      case "rating":
        mongooseQuery = mongooseQuery.sort({ averageRating: -1 });
        break;
      default:
        mongooseQuery = mongooseQuery.sort({ createdAt: -1 });
    }
  } else {
    mongooseQuery = mongooseQuery.sort({ createdAt: -1 });
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 12;
  const startIndex = (page - 1) * limit;

  mongooseQuery = mongooseQuery.skip(startIndex).limit(limit);

  // Populate category
  mongooseQuery = mongooseQuery.populate("category", "name slug");

  try {
    // Execute query
    const products = await mongooseQuery.lean().exec();

    // Get total count for pagination
    const total = await Product.countDocuments(query);

    console.log(`Found ${products.length} products out of ${total} total`);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        limit,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
      products,
    });
  } catch (error) {
    console.error("Product query error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching products",
    });
  }
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = asyncHandler(async (req, res) => {
  console.log("🔍 [GET PRODUCT] Called for ID:", req.params.id);

  // Add no-cache headers
  addNoCacheHeaders(res);

  // Get the product - DO NOT use lean() so we can save if needed
  const product = await Product.findById(req.params.id).populate(
    "category",
    "name slug"
  );

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  // DIAGNOSTIC: Log what we found in the database
  console.log("📦 [GET PRODUCT] Found product:", product.name);
  console.log("🖼️  [GET PRODUCT] Images array:", product.images);
  console.log("🖼️  [GET PRODUCT] Images count:", product.images?.length || 0);
  if (product.images && product.images.length > 0) {
    console.log("🖼️  [GET PRODUCT] First image:", product.images[0]);
  }
  console.log("📊 [GET PRODUCT] totalStock from DB:", product.totalStock);
  console.log(
    "📊 [GET PRODUCT] variants from DB:",
    product.variants.map((v) => ({
      size: v.size,
      color: v.color.name,
      stock: v.stock,
    }))
  );

  // For public users, check if product is active
  // For admin users, allow viewing any status
  const isAdmin = req.user && req.user.role === "admin";

  if (!isAdmin && product.status !== "active") {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  // Recalculate totalStock from variants to ensure accuracy
  let needsUpdate = false;
  if (product.variants && product.variants.length > 0) {
    const recalculatedTotal = product.variants.reduce((total, variant) => {
      return total + (variant.stock || 0);
    }, 0);

    console.log("🔄 [GET PRODUCT] Recalculated totalStock:", recalculatedTotal);

    // Check if totalStock is different
    if (product.totalStock !== recalculatedTotal) {
      console.log("⚠️  [GET PRODUCT] Stock mismatch detected! Updating...");
      console.log(
        `   DB shows: ${product.totalStock}, Should be: ${recalculatedTotal}`
      );
      product.totalStock = recalculatedTotal;
      needsUpdate = true;
    }
  }

  // Save if stock was corrected
  if (needsUpdate) {
    try {
      await product.save();
      console.log("✅ [GET PRODUCT] Stock corrected and saved");
    } catch (saveError) {
      console.error(
        "❌ [GET PRODUCT] Failed to save corrected stock:",
        saveError
      );
      // Don't fail the request, just log the error
    }
  }

  // Increment view count asynchronously (don't wait for it)
  Product.findByIdAndUpdate(
    req.params.id,
    { $inc: { views: 1 } },
    { new: false }
  )
    .exec()
    .catch((err) => console.error("View increment error:", err));

  console.log(
    "📤 [GET PRODUCT] Sending response with totalStock:",
    product.totalStock
  );
  console.log(
    "📤 [GET PRODUCT] Sending images count:",
    product.images?.length || 0
  );

  res.status(200).json({
    success: true,
    product,
  });
});

// @desc    Get product by slug
// @route   GET /api/products/slug/:slug
// @access  Public
exports.getProductBySlug = asyncHandler(async (req, res) => {
  // Add no-cache headers
  addNoCacheHeaders(res);

  const product = await Product.findOne({
    slug: req.params.slug,
    status: "active",
  }).populate("category", "name slug");

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  // Increment view count
  product.views += 1;
  await product.save();

  res.status(200).json({
    success: true,
    product,
  });
});

// @desc    Get related products
// @route   GET /api/products/:id/related
// @access  Public
exports.getRelatedProducts = asyncHandler(async (req, res) => {
  // Add no-cache headers
  addNoCacheHeaders(res);

  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  // Find products in same category (exclude current product)
  const relatedProducts = await Product.find({
    category: product.category,
    _id: { $ne: product._id },
    status: "active",
  })
    .populate("category", "name slug")
    .limit(4)
    .sort({ averageRating: -1, purchases: -1 });

  res.status(200).json({
    success: true,
    count: relatedProducts.length,
    products: relatedProducts,
  });
});

// @desc    Create product (Admin only)
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = asyncHandler(async (req, res) => {
  try {
    console.log("\n========== CREATE PRODUCT START ==========");
    console.log("📝 Request body keys:", Object.keys(req.body));
    console.log("📁 Files received:", req.files?.length || 0);

    if (req.files && req.files.length > 0) {
      console.log("📸 File details:");
      req.files.forEach((file, index) => {
        console.log(`   [${index}] ${file.originalname}`);
        console.log(`       - Size: ${(file.size / 1024).toFixed(2)} KB`);
        console.log(`       - Cloudinary URL: ${file.path}`);
        console.log(`       - Public ID: ${file.filename}`);
      });
    }

    // Parse variants from JSON
    let variants = [];
    try {
      if (req.body.variants) {
        variants = JSON.parse(req.body.variants);
        console.log("✅ Parsed variants:", variants.length);
      }
    } catch (error) {
      console.error("❌ Error parsing variants:", error);
    }

    // Extract arrays (materials, features, careInstructions)
    const extractArray = (fieldName) => {
      const array = [];
      let index = 0;
      while (req.body[`${fieldName}[${index}]`]) {
        const item = req.body[`${fieldName}[${index}]`];
        if (item && item.trim()) {
          array.push(item.trim());
        }
        index++;
      }
      return array;
    };

    // Extract SEO data
    const seo = {
      metaTitle: req.body["seo[metaTitle]"] || "",
      metaDescription: req.body["seo[metaDescription]"] || "",
      keywords: req.body["seo[keywords]"] || "",
    };

    // Validate required fields
    if (
      !req.body.name ||
      !req.body.description ||
      !req.body.brand ||
      !req.body.sku ||
      !req.body.price
    ) {
      console.log("❌ Validation failed: Missing required fields");

      // Clean up uploaded images
      if (req.files && req.files.length > 0) {
        const publicIds = req.files.map((file) => file.filename);
        await deleteMultipleFromCloudinary(publicIds);
        console.log("🧹 Cleaned up uploaded images");
      }

      return res.status(400).json({
        success: false,
        message:
          "Please provide all required fields: name, description, brand, sku, and price",
      });
    }

    // Validate sale price vs regular price
    const price = parseFloat(req.body.price);
    const salePrice = req.body.salePrice
      ? parseFloat(req.body.salePrice)
      : null;

    if (salePrice && salePrice >= price) {
      console.log("❌ Validation failed: Sale price >= regular price");

      if (req.files && req.files.length > 0) {
        const publicIds = req.files.map((file) => file.filename);
        await deleteMultipleFromCloudinary(publicIds);
        console.log("🧹 Cleaned up uploaded images");
      }

      return res.status(400).json({
        success: false,
        message: "Sale price must be less than regular price",
      });
    }

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku: req.body.sku });
    if (existingProduct) {
      console.log("❌ Validation failed: SKU already exists");

      if (req.files && req.files.length > 0) {
        const publicIds = req.files.map((file) => file.filename);
        await deleteMultipleFromCloudinary(publicIds);
        console.log("🧹 Cleaned up uploaded images");
      }

      return res.status(400).json({
        success: false,
        message: "Product with this SKU already exists",
      });
    }

    // Check if slug already exists
    const existingSlug = await Product.findOne({ slug: req.body.slug });
    if (existingSlug) {
      console.log("❌ Validation failed: Slug already exists");

      if (req.files && req.files.length > 0) {
        const publicIds = req.files.map((file) => file.filename);
        await deleteMultipleFromCloudinary(publicIds);
        console.log("🧹 Cleaned up uploaded images");
      }

      return res.status(400).json({
        success: false,
        message: "Product with this slug already exists",
      });
    }

    // Validate category exists
    if (req.body.category) {
      const categoryExists = await Category.findById(req.body.category);
      if (!categoryExists) {
        console.log("❌ Validation failed: Invalid category");

        if (req.files && req.files.length > 0) {
          const publicIds = req.files.map((file) => file.filename);
          await deleteMultipleFromCloudinary(publicIds);
          console.log("🧹 Cleaned up uploaded images");
        }

        return res.status(400).json({
          success: false,
          message: "Invalid category selected",
        });
      }
    }

    // Create product data
    const productData = {
      name: req.body.name,
      description: req.body.description,
      brand: req.body.brand,
      sku: req.body.sku,
      slug: req.body.slug,
      price: price,
      salePrice: salePrice,
      cost: req.body.cost ? parseFloat(req.body.cost) : null,
      category: req.body.category || null,
      status: req.body.status || "active",
      isFeatured:
        req.body.featured === "true" || req.body.isFeatured === "true",
      isNewArrival: req.body.isNewArrival === "true",
      variants:
        variants.length > 0
          ? variants.map((variant) => ({
              ...variant,
              variantSku: `${req.body.sku}-${variant.size}-${variant.color.name
                .replace(/\s+/g, "")
                .toUpperCase()}`,
            }))
          : [
              {
                size: "S",
                color: { name: "Black", hexCode: "#000000" },
                stock: 0,
                variantSku: `${req.body.sku}-S-BLACK`,
              },
            ],
      materials: extractArray("materials"),
      features: extractArray("features"),
      careInstructions: extractArray("careInstructions"),
      seo: seo,
    };

    // Calculate total stock
    productData.totalStock = productData.variants.reduce(
      (total, variant) => total + (parseInt(variant.stock) || 0),
      0
    );

    console.log("📊 Total stock calculated:", productData.totalStock);

    // Handle images uploaded to Cloudinary
    console.log("\n🖼️  Processing images...");
    if (req.files && req.files.length > 0) {
      console.log(`📤 Processing ${req.files.length} Cloudinary images...`);

      productData.images = req.files.map((file, index) => {
        const imageData = {
          url: file.path, // Cloudinary returns full URL in path
          publicId: file.filename, // Cloudinary public ID
          alt: "",
          isPrimary: index === 0,
        };
        console.log(`   [${index}] Created image object:`, imageData);
        return imageData;
      });

      console.log("✅ Images array created:", productData.images.length);
    } else {
      console.log("⚠️  No images uploaded");
      productData.images = [];
    }

    // CRITICAL: Log the complete productData before saving
    console.log("\n📦 Product data to save:");
    console.log("   - Name:", productData.name);
    console.log("   - SKU:", productData.sku);
    console.log("   - Images count:", productData.images?.length || 0);
    console.log(
      "   - Images array:",
      JSON.stringify(productData.images, null, 2)
    );

    // Create and save the product
    console.log("\n💾 Saving product to database...");
    const product = new Product(productData);
    await product.save();

    console.log("✅ Product saved with ID:", product._id);
    console.log("🖼️  Images in saved product:", product.images?.length || 0);
    console.log(
      "📋 Saved product images:",
      JSON.stringify(product.images, null, 2)
    );

    // Populate category for response
    await product.populate("category", "name slug");

    console.log("\n📤 Sending response...");
    console.log("   - Product ID:", product._id);
    console.log("   - Images count:", product.images?.length || 0);
    console.log("========== CREATE PRODUCT END ==========\n");

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error("\n❌ PRODUCT CREATION ERROR:");
    console.error("   Message:", error.message);
    console.error("   Stack:", error.stack);

    // Clean up uploaded images if product creation fails
    if (req.files && req.files.length > 0) {
      try {
        const publicIds = req.files.map((file) => file.filename);
        await deleteMultipleFromCloudinary(publicIds);
        console.log("🧹 Cleaned up uploaded images after error");
      } catch (cleanupError) {
        console.error("❌ Error cleaning up images:", cleanupError);
      }
    }

    // Handle mongoose validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      console.error("   Validation errors:", errors);
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to create product",
    });
  }
});

// @desc    Update product (Admin only)
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = asyncHandler(async (req, res) => {
  try {
    console.log("\n========================================");
    console.log("🔄 UPDATE PRODUCT REQUEST STARTED");
    console.log("========================================");
    console.log("📝 Product ID:", req.params.id);
    console.log("📝 Request method:", req.method);
    console.log("📝 Content-Type:", req.headers["content-type"]);
    console.log(
      "📁 Files received by multer:",
      req.files ? req.files.length : 0
    );
    console.log("📋 Body keys:", Object.keys(req.body));

    // CRITICAL: Log file details
    if (req.files && req.files.length > 0) {
      console.log("\n📸 NEW FILES RECEIVED:");
      req.files.forEach((file, index) => {
        console.log(`   [${index}] ${file.originalname}`);
        console.log(`       Cloudinary URL: ${file.path}`);
        console.log(`       Public ID: ${file.filename}`);
      });
    } else {
      console.log("⚠️  NO NEW FILES received by multer");
    }

    let product = await Product.findById(req.params.id);

    if (!product) {
      if (req.files && req.files.length > 0) {
        const publicIds = req.files.map((file) => file.filename);
        await deleteMultipleFromCloudinary(publicIds);
      }
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    console.log("\n📦 CURRENT PRODUCT:");
    console.log("   Name:", product.name);
    console.log("   Current images:", product.images?.length || 0);

    // Parse variants
    let variants = [];
    try {
      if (req.body.variants) {
        variants =
          typeof req.body.variants === "string"
            ? JSON.parse(req.body.variants)
            : req.body.variants;
        console.log("✅ Parsed", variants.length, "variants");
      }
    } catch (error) {
      console.error("❌ Error parsing variants:", error);
    }

    // Extract arrays with support for both formats
    const extractArray = (fieldName) => {
      const array = [];
      let index = 0;

      console.log(`\n📋 Extracting ${fieldName}:`);
      console.log(`   Looking for: ${fieldName}[0], ${fieldName}[1], etc.`);
      console.log(
        `   Available keys:`,
        Object.keys(req.body).filter((k) => k.startsWith(fieldName))
      );

      // First, try to find indexed format: fieldName[0], fieldName[1], etc.
      while (req.body[`${fieldName}[${index}]`]) {
        const item = req.body[`${fieldName}[${index}]`];
        console.log(`   ✅ [${index}] Found: "${item}"`);

        if (item && item.trim()) {
          array.push(item.trim());
        }
        index++;
      }

      // If no indexed items found, check if there's a direct field with the name
      // This handles cases where multer might have parsed it differently
      if (array.length === 0 && req.body[fieldName]) {
        console.log(
          `   ⚠️  No indexed format found, checking for direct field...`
        );

        // Check if it's already an array
        if (Array.isArray(req.body[fieldName])) {
          console.log(`   ✅ Found as array:`, req.body[fieldName]);
          req.body[fieldName].forEach((item, idx) => {
            if (item && item.trim()) {
              array.push(item.trim());
              console.log(`   ✅ [${idx}] Extracted: "${item}"`);
            }
          });
        }
        // Check if it's a string (single item or comma-separated)
        else if (typeof req.body[fieldName] === "string") {
          const value = req.body[fieldName].trim();
          if (value) {
            console.log(`   ✅ Found as string: "${value}"`);
            // If it looks like a comma-separated list, split it
            if (value.includes(",")) {
              value.split(",").forEach((item, idx) => {
                const trimmed = item.trim();
                if (trimmed) {
                  array.push(trimmed);
                  console.log(`   ✅ [${idx}] Split item: "${trimmed}"`);
                }
              });
            } else {
              array.push(value);
              console.log(`   ✅ [0] Single item: "${value}"`);
            }
          }
        }
      }

      console.log(`   📊 Total extracted: ${array.length} items`);
      console.log(`   📦 Array content:`, array);
      return array;
    };

    const seo = {
      metaTitle: req.body["seo[metaTitle]"] || product.seo?.metaTitle || "",
      metaDescription:
        req.body["seo[metaDescription]"] || product.seo?.metaDescription || "",
      keywords: req.body["seo[keywords]"] || product.seo?.keywords || "",
    };

    // ===== ADD THIS NEW SECTION =====
    // Extract arrays ONCE and store in variables
    console.log("\n🔍 EXTRACTING PRODUCT DETAILS...");
    const extractedMaterials = extractArray("materials");
    const extractedFeatures = extractArray("features");
    const extractedCareInstructions = extractArray("careInstructions");

    console.log("\n📊 EXTRACTION SUMMARY:");
    console.log(
      "   Materials:",
      extractedMaterials.length,
      "items -",
      extractedMaterials
    );
    console.log(
      "   Features:",
      extractedFeatures.length,
      "items -",
      extractedFeatures
    );
    console.log(
      "   Care Instructions:",
      extractedCareInstructions.length,
      "items -",
      extractedCareInstructions
    );
    // ===== END NEW SECTION =====

    // Validate sale price - check against the price being updated or existing price
    if (req.body.salePrice && req.body.salePrice !== "") {
      const priceToCheck = req.body.price
        ? parseFloat(req.body.price)
        : product.price;
      const salePriceToCheck = parseFloat(req.body.salePrice);

      console.log("\n💰 PRICE VALIDATION:");
      console.log(
        `   Regular Price: ${priceToCheck} (type: ${typeof priceToCheck})`
      );
      console.log(
        `   Sale Price: ${salePriceToCheck} (type: ${typeof salePriceToCheck})`
      );
      console.log(`   Sale >= Regular? ${salePriceToCheck >= priceToCheck}`);

      if (
        !isNaN(salePriceToCheck) &&
        !isNaN(priceToCheck) &&
        salePriceToCheck >= priceToCheck
      ) {
        if (req.files && req.files.length > 0) {
          const publicIds = req.files.map((file) => file.filename);
          await deleteMultipleFromCloudinary(publicIds);
        }
        return res.status(400).json({
          success: false,
          message: `Sale price (${salePriceToCheck}) must be less than regular price (${priceToCheck})`,
        });
      }
    }

    // Also validate the final updateData values before saving
    const finalPrice = req.body.price
      ? parseFloat(req.body.price)
      : product.price;
    const finalSalePrice = req.body.salePrice
      ? parseFloat(req.body.salePrice)
      : req.body.salePrice === ""
      ? null
      : product.salePrice;

    if (finalSalePrice && finalPrice && finalSalePrice >= finalPrice) {
      console.error(
        `❌ Final validation failed: salePrice ${finalSalePrice} >= price ${finalPrice}`
      );
      if (req.files && req.files.length > 0) {
        const publicIds = req.files.map((file) => file.filename);
        await deleteMultipleFromCloudinary(publicIds);
      }
      return res.status(400).json({
        success: false,
        message: `Sale price (${finalSalePrice}) must be less than regular price (${finalPrice})`,
      });
    }

    // Check SKU conflicts
    if (req.body.sku && req.body.sku !== product.sku) {
      const existingProduct = await Product.findOne({
        sku: req.body.sku,
        _id: { $ne: req.params.id },
      });
      if (existingProduct) {
        if (req.files && req.files.length > 0) {
          const publicIds = req.files.map((file) => file.filename);
          await deleteMultipleFromCloudinary(publicIds);
        }
        return res.status(400).json({
          success: false,
          message: "Product with this SKU already exists",
        });
      }
    }

    // Check slug conflicts
    if (req.body.slug && req.body.slug !== product.slug) {
      const existingSlug = await Product.findOne({
        slug: req.body.slug,
        _id: { $ne: req.params.id },
      });
      if (existingSlug) {
        if (req.files && req.files.length > 0) {
          const publicIds = req.files.map((file) => file.filename);
          await deleteMultipleFromCloudinary(publicIds);
        }
        return res.status(400).json({
          success: false,
          message: "Product with this slug already exists",
        });
      }
    }

    console.log("\n🖼️  PROCESSING IMAGES...");

    // Handle images update
    let updatedImages = [];

    // 1. First, check if new images are being uploaded
    const hasNewImages = req.files && req.files.length > 0;
    console.log("Has new images to upload:", hasNewImages);
    console.log("New images count:", req.files?.length || 0);

    // 2. Parse existing images to keep
    if (req.body.existingImages) {
      try {
        const existingImages = JSON.parse(req.body.existingImages);
        console.log("📸 Existing images to keep:", existingImages.length);
        updatedImages = existingImages;
      } catch (e) {
        console.error("❌ Error parsing existingImages:", e);
      }
    } else {
      console.log("⚠️  No existingImages field in request");
    }

    // 3. Add new uploaded images FIRST (before deletions)
    if (hasNewImages) {
      console.log(`✅ Adding ${req.files.length} NEW Cloudinary images`);

      const newImages = req.files.map((file, index) => {
        const imageObj = {
          url: file.path,
          publicId: file.filename,
          alt: "",
          isPrimary: updatedImages.length === 0 && index === 0,
        };

        console.log(`   [${index}] New image:`);
        console.log(`       URL: ${imageObj.url}`);
        console.log(`       Public ID: ${imageObj.publicId}`);
        console.log(`       Primary: ${imageObj.isPrimary}`);

        return imageObj;
      });

      updatedImages = [...updatedImages, ...newImages];
      console.log("✅ Total images after adding new:", updatedImages.length);
    }

    // 4. NOW handle deletions (after confirming we have images)
    if (req.body.imagesToDelete) {
      try {
        const imagesToDelete = JSON.parse(req.body.imagesToDelete);
        console.log("🗑️  Images marked for deletion:", imagesToDelete.length);

        // Only proceed with deletion if we'll have images remaining
        const existingCount = updatedImages.filter((img) => img._id).length;
        const newCount = updatedImages.filter((img) => !img._id).length;
        const toDeleteCount = imagesToDelete.length;

        console.log(
          `   Current images: ${updatedImages.length} (${existingCount} existing, ${newCount} new)`
        );
        console.log(`   To delete: ${toDeleteCount}`);

        // Check if deletion would leave us with no images
        if (existingCount <= toDeleteCount && newCount === 0) {
          console.log(
            "⚠️  WARNING: Deletion would leave no images, checking for new uploads..."
          );
          if (!hasNewImages) {
            console.error("❌ Cannot delete all images without replacements!");

            // Clean up any uploaded files
            if (req.files && req.files.length > 0) {
              const publicIds = req.files.map((file) => file.filename);
              await deleteMultipleFromCloudinary(publicIds);
            }

            return res.status(400).json({
              success: false,
              message: "Product must have at least one image",
              errors: [
                "Cannot remove all product images. Please add at least one image.",
              ],
            });
          }
        }

        // Delete from Cloudinary
        for (const imageId of imagesToDelete) {
          const image = product.images.find(
            (img) => img._id.toString() === imageId || img.publicId === imageId
          );
          if (image && image.publicId) {
            console.log("   Deleting from Cloudinary:", image.publicId);
            await deleteFromCloudinary(image.publicId);
          }
        }

        // Filter out deleted images from existing images only
        updatedImages = updatedImages.filter((img) => {
          // Keep all new images (they don't have _id yet)
          if (!img._id) return true;

          // Check if this existing image should be deleted
          const shouldDelete = imagesToDelete.includes(img._id.toString());
          if (shouldDelete) {
            console.log(`   Removing image with _id: ${img._id}`);
          }
          return !shouldDelete;
        });

        console.log(
          "✅ After deletion, images remaining:",
          updatedImages.length
        );
      } catch (e) {
        console.error("❌ Error handling image deletion:", e);
      }
    }

    // 5. Final validation - ensure at least one image exists
    if (updatedImages.length === 0) {
      console.error("❌ No images remaining after update!");

      // Clean up any uploaded files
      if (req.files && req.files.length > 0) {
        const publicIds = req.files.map((file) => file.filename);
        await deleteMultipleFromCloudinary(publicIds);
        console.log("🧹 Cleaned up uploaded images");
      }

      return res.status(400).json({
        success: false,
        message: "Product must have at least one image",
        errors: ["At least one product image is required"],
      });
    }

    // Ensure at least one image is marked as primary
    if (!updatedImages.some((img) => img.isPrimary)) {
      updatedImages[0].isPrimary = true;
      console.log("✅ Set first image as primary");
    }

    console.log("\n🖼️  FINAL IMAGE COUNT:", updatedImages.length);
    console.log("   Images array:", JSON.stringify(updatedImages, null, 2));

    // Build update data
    const updateData = {
      name: req.body.name || product.name,
      description: req.body.description || product.description,
      brand: req.body.brand || product.brand,
      sku: req.body.sku || product.sku,
      slug: req.body.slug || product.slug,
      price: req.body.price ? parseFloat(req.body.price) : product.price,
      salePrice: req.body.salePrice
        ? parseFloat(req.body.salePrice)
        : req.body.salePrice === ""
        ? null
        : product.salePrice,
      cost: req.body.cost ? parseFloat(req.body.cost) : product.cost,
      category: req.body.category || product.category,
      status: req.body.status || product.status,
      isFeatured:
        req.body.featured !== undefined
          ? req.body.featured === "true"
          : req.body.isFeatured !== undefined
          ? req.body.isFeatured === "true"
          : product.isFeatured,
      isNewArrival:
        req.body.isNewArrival !== undefined
          ? req.body.isNewArrival === "true"
          : product.isNewArrival,
      variants: variants.length > 0 ? variants : product.variants,
      // Use extracted variables (not calling extractArray again)
      materials:
        extractedMaterials.length > 0 ? extractedMaterials : product.materials,
      features:
        extractedFeatures.length > 0 ? extractedFeatures : product.features,
      careInstructions:
        extractedCareInstructions.length > 0
          ? extractedCareInstructions
          : product.careInstructions,
      seo: seo,
      images: updatedImages,
    };

    // Calculate total stock
    updateData.totalStock = updateData.variants.reduce(
      (total, variant) => total + (parseInt(variant.stock) || 0),
      0
    );

    console.log("\n💾 UPDATING DATABASE...");
    console.log("   Total stock:", updateData.totalStock);
    console.log("   Images to save:", updateData.images.length);
    console.log("   Materials to save:", updateData.materials);
    console.log("   Features to save:", updateData.features);
    console.log("   Care Instructions to save:", updateData.careInstructions);
    console.log("   Price:", updateData.price);
    console.log("   Sale Price:", updateData.salePrice);

    // Instead of findByIdAndUpdate, update the product object directly and save
    // This ensures the validators have the correct context with both price and salePrice
    Object.assign(product, updateData);

    // Save the product with proper validation context
    await product.save();

    // Populate category after saving
    await product.populate("category", "name slug");

    console.log("\n✅ UPDATE COMPLETED");
    console.log("   Images in updated product:", product.images?.length || 0);

    // Verify
    const verifyProduct = await Product.findById(req.params.id).lean();
    console.log("\n🔍 VERIFICATION:");
    console.log("   Images in database:", verifyProduct.images?.length || 0);
    console.log("   Materials in database:", verifyProduct.materials);
    console.log("   Features in database:", verifyProduct.features);
    console.log(
      "   Care Instructions in database:",
      verifyProduct.careInstructions
    );

    if (verifyProduct.images && verifyProduct.images.length > 0) {
      console.log("✅ Images successfully saved to database");
    } else if (updatedImages.length > 0) {
      console.log("❌ WARNING: We tried to save images but they're not in DB!");
    }

    console.log("========================================");
    console.log("✅ UPDATE PRODUCT COMPLETED");
    console.log("========================================\n");

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("\n========================================");
    console.error("❌ UPDATE PRODUCT ERROR");
    console.error("========================================");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);

    if (req.files && req.files.length > 0) {
      try {
        const publicIds = req.files.map((file) => file.filename);
        await deleteMultipleFromCloudinary(publicIds);
        console.log("🧹 Cleaned up uploaded images");
      } catch (cleanupError) {
        console.error("❌ Cleanup error:", cleanupError);
      }
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to update product",
    });
  }
});

// @desc    Delete product (Admin only)
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  // Delete all product images from Cloudinary
  if (product.images && product.images.length > 0) {
    try {
      const publicIds = product.images
        .filter((img) => img.publicId)
        .map((img) => img.publicId);

      if (publicIds.length > 0) {
        console.log(`Deleting ${publicIds.length} images from Cloudinary`);
        await deleteMultipleFromCloudinary(publicIds);
        console.log("Images deleted from Cloudinary successfully");
      }
    } catch (error) {
      console.error("Error deleting images from Cloudinary:", error);
      // Continue with product deletion even if image deletion fails
    }
  }

  await product.deleteOne();

  res.status(200).json({
    success: true,
    message: "Product and associated images deleted successfully",
  });
});
