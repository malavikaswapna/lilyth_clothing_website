// controllers/productController.js
const Product = require("../models/Product");
const Category = require("../models/Category");
const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");

// @desc    Get all products
// @route   GET /api/products
// @access  Public

exports.getProducts = asyncHandler(async (req, res) => {
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

  // Low stock filter (admin only)
  if (req.query.lowStock === "true") {
    query.totalStock = { $lt: 10 }; // Products with less than 10 items
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

  // Featured filter (for admin)
  if (req.query.featured === "true") {
    query.isFeatured = true;
  }

  // New arrivals filter (for admin)
  if (req.query.newArrivals === "true") {
    query.isNewArrival = true;
  }
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = asyncHandler(async (req, res) => {
  console.log("🔍 [GET PRODUCT] Called for ID:", req.params.id);

  // First, get the product with fresh data using lean()
  const product = await Product.findById(req.params.id)
    .populate("category", "name slug")
    .lean(); // Use lean() to get plain object with fresh data

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  console.log("🔍 [GET PRODUCT] Found product:", product.name);
  console.log("🔍 [GET PRODUCT] totalStock from DB:", product.totalStock);
  console.log(
    "🔍 [GET PRODUCT] variants from DB:",
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
  if (product.variants && product.variants.length > 0) {
    const recalculatedTotal = product.variants.reduce((total, variant) => {
      return total + (variant.stock || 0);
    }, 0);
    console.log("🔍 [GET PRODUCT] Recalculated totalStock:", recalculatedTotal);
    product.totalStock = recalculatedTotal;
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
    "🔍 [GET PRODUCT] Sending response with totalStock:",
    product.totalStock
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
    // Parse variants from JSON (your frontend sends it as JSON)
    let variants = [];
    try {
      if (req.body.variants) {
        variants = JSON.parse(req.body.variants);
      }
    } catch (error) {
      console.error("Error parsing variants:", error);
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
      return res.status(400).json({
        success: false,
        message: "Sale price must be less than regular price",
      });
    }

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku: req.body.sku });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product with this SKU already exists",
      });
    }

    // Check if slug already exists
    const existingSlug = await Product.findOne({ slug: req.body.slug });
    if (existingSlug) {
      return res.status(400).json({
        success: false,
        message: "Product with this slug already exists",
      });
    }

    // Validate category exists
    if (req.body.category) {
      const categoryExists = await Category.findById(req.body.category);
      if (!categoryExists) {
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
      featured: req.body.featured === "true",
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
                size: "S", // Use a valid enum value instead of 'One Size'
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
      (total, variant) => total + variant.stock,
      0
    );

    // Handle images if uploaded
    if (req.files && req.files.length > 0) {
      productData.images = req.files.map((file, index) => ({
        url: `/uploads/${file.filename}`, // Adjust based on your upload setup
        alt: "",
        isPrimary: index === 0,
      }));
    } else {
      // Default empty images array
      productData.images = [];
    }

    // Create and save the product
    const product = new Product(productData);
    await product.save();

    // Populate category for response
    await product.populate("category", "name slug");

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error("Product creation error:", error);

    // Handle mongoose validation errors
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
      message: error.message || "Failed to create product",
    });
  }
});

// @desc    Update product (Admin only)
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = asyncHandler(async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Similar processing as createProduct for updates
    const variants = [];
    let variantIndex = 0;

    while (req.body[`variants[${variantIndex}][size]`]) {
      variants.push({
        size: req.body[`variants[${variantIndex}][size]`],
        color: {
          name: req.body[`variants[${variantIndex}][color][name]`],
          hexCode: req.body[`variants[${variantIndex}][color][hexCode]`],
        },
        stock: parseInt(req.body[`variants[${variantIndex}][stock]`]) || 0,
      });
      variantIndex++;
    }

    // Extract arrays
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
      metaTitle: req.body["seo[metaTitle]"] || product.seo?.metaTitle || "",
      metaDescription:
        req.body["seo[metaDescription]"] || product.seo?.metaDescription || "",
      keywords: req.body["seo[keywords]"] || product.seo?.keywords || "",
    };

    // Validate sale price if provided
    if (req.body.price && req.body.salePrice) {
      const price = parseFloat(req.body.price);
      const salePrice = parseFloat(req.body.salePrice);

      if (salePrice >= price) {
        return res.status(400).json({
          success: false,
          message: "Sale price must be less than regular price",
        });
      }
    }

    // Check for SKU conflicts (excluding current product)
    if (req.body.sku && req.body.sku !== product.sku) {
      const existingProduct = await Product.findOne({
        sku: req.body.sku,
        _id: { $ne: req.params.id },
      });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: "Product with this SKU already exists",
        });
      }
    }

    // Check for slug conflicts (excluding current product)
    if (req.body.slug && req.body.slug !== product.slug) {
      const existingSlug = await Product.findOne({
        slug: req.body.slug,
        _id: { $ne: req.params.id },
      });
      if (existingSlug) {
        return res.status(400).json({
          success: false,
          message: "Product with this slug already exists",
        });
      }
    }

    // Update product data
    const updateData = {
      name: req.body.name || product.name,
      description: req.body.description || product.description,
      brand: req.body.brand || product.brand,
      sku: req.body.sku || product.sku,
      slug: req.body.slug || product.slug,
      price: req.body.price ? parseFloat(req.body.price) : product.price,
      salePrice: req.body.salePrice
        ? parseFloat(req.body.salePrice)
        : product.salePrice,
      cost: req.body.cost ? parseFloat(req.body.cost) : product.cost,
      category: req.body.category || product.category,
      status: req.body.status || product.status,
      featured:
        req.body.featured !== undefined
          ? req.body.featured === "true"
          : product.featured,
      isNewArrival:
        req.body.isNewArrival !== undefined
          ? req.body.isNewArrival === "true"
          : product.isNewArrival,
      variants: variants.length > 0 ? variants : product.variants,
      materials:
        extractArray("materials").length > 0
          ? extractArray("materials")
          : product.materials,
      features:
        extractArray("features").length > 0
          ? extractArray("features")
          : product.features,
      careInstructions:
        extractArray("careInstructions").length > 0
          ? extractArray("careInstructions")
          : product.careInstructions,
      seo: seo,
    };

    // Calculate total stock
    updateData.totalStock = updateData.variants.reduce(
      (total, variant) => total + variant.stock,
      0
    );

    // Handle new images if uploaded
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file, index) => ({
        url: `/uploads/${file.filename}`,
        alt: "",
        isPrimary: index === 0 && product.images.length === 0,
      }));
      updateData.images = [...product.images, ...newImages];
    }

    // Handle existing images
    if (req.body.existingImages) {
      try {
        const existingImages = JSON.parse(req.body.existingImages);
        updateData.images = updateData.images
          ? [...existingImages, ...updateData.images]
          : existingImages;
      } catch (e) {
        console.error("Error parsing existing images:", e);
      }
    }

    product = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("category", "name slug");

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("Product update error:", error);

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

  await product.deleteOne();

  res.status(200).json({
    success: true,
    message: "Product deleted successfully",
  });
});
