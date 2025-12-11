// controllers/adminController.js
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Category = require("../models/Category");
const asyncHandler = require("../utils/asyncHandler");
const csv = require("csv-stringify");
const crypto = require("crypto");
const { auditLogger, AuditLog } = require("../utils/auditLogger");
const inventoryMonitor = require("../utils/inventoryMonitor");
const StoreSettings = require("../models/StoreSettings");
const {
  sendBackInStockNotification,
} = require("../utils/productNotificationService");

// @desc    Get admin dashboard analytics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getDashboard = asyncHandler(async (req, res) => {
  const today = new Date();
  const lastMonth = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    today.getDate()
  );
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Total counts
  const totalUsers = await User.countDocuments({
    role: "customer",
    email: { $not: /^deleted_/ },
  });
  const totalProducts = await Product.countDocuments();
  const totalOrders = await Order.countDocuments();

  // Recent counts
  const newUsersThisMonth = await User.countDocuments({
    role: "customer",
    email: { $not: /^deleted_/ },
    createdAt: { $gte: lastMonth },
  });

  const ordersThisWeek = await Order.countDocuments({
    createdAt: { $gte: lastWeek },
  });

  // Revenue analytics
  const totalRevenue = await Order.aggregate([
    { $match: { "payment.status": "completed" } },
    { $group: { _id: null, total: { $sum: "$total" } } },
  ]);

  const monthlyRevenue = await Order.aggregate([
    {
      $match: {
        "payment.status": "completed",
        createdAt: { $gte: lastMonth },
      },
    },
    { $group: { _id: null, total: { $sum: "$total" } } },
  ]);

  // Top selling products
  const topProducts = await Product.find()
    .sort({ purchases: -1 })
    .limit(5)
    .select("name purchases revenue images");

  // Low stock products
  const lowStockProducts = await Product.find({
    totalStock: { $lt: 10, $gt: 0 },
  }).select("name totalStock variants");

  // Order status breakdown
  const orderStatusBreakdown = await Order.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  // Recent orders
  const recentOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("user", "firstName lastName email")
    .select("orderNumber total status createdAt user");

  res.status(200).json({
    success: true,
    dashboard: {
      totals: {
        users: totalUsers,
        products: totalProducts,
        orders: totalOrders,
        revenue: totalRevenue[0]?.total || 0,
      },
      recent: {
        newUsers: newUsersThisMonth,
        weeklyOrders: ordersThisWeek,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
      },
      topProducts,
      lowStockProducts,
      orderStatusBreakdown,
      recentOrders,
    },
  });
});

// @desc    Get all users (Admin)
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;

  let query = User.find({ role: "customer" });

  // Search functionality
  if (req.query.search) {
    query = query.where({
      $or: [
        { firstName: { $regex: req.query.search, $options: "i" } },
        { lastName: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
      ],
    });
  }

  // Filter by active status - FIXED
  if (req.query.active !== undefined && req.query.active !== "") {
    const isActive = req.query.active === "true";
    query = query.where("isActive").equals(isActive);
  }
  // If req.query.active is undefined or empty string, don't filter by isActive

  // ⬅️ Hide deleted users filter
  if (req.query.hideDeleted === "true" || req.query.hideDeleted === true) {
    query = query.where("email").regex(/^(?!deleted_)/);
  }

  const users = await query
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit)
    .select("-password");

  // Get total count with the same filters (excluding pagination)
  let countQuery = User.find({ role: "customer" });

  if (req.query.search) {
    countQuery = countQuery.where({
      $or: [
        { firstName: { $regex: req.query.search, $options: "i" } },
        { lastName: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
      ],
    });
  }

  if (req.query.active !== undefined && req.query.active !== "") {
    const isActive = req.query.active === "true";
    countQuery = countQuery.where("isActive").equals(isActive);
  }

  // ⬅️ NEW: Also add hideDeleted filter to count query
  if (req.query.hideDeleted === "true" || req.query.hideDeleted === true) {
    countQuery = countQuery.where("email").regex(/^(?!deleted_)/);
  }

  const total = await countQuery.countDocuments();

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    pagination: {
      page,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
    users,
  });
});

// @desc    Get single user details (Admin)
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUserDetails = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Get user's order history
  const orders = await Order.find({ user: req.params.id })
    .sort({ createdAt: -1 })
    .limit(10)
    .select("orderNumber total status createdAt");

  res.status(200).json({
    success: true,
    user,
    orders,
  });
});

// @desc    Update user status (Admin)
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive },
    { new: true, runValidators: true }
  ).select("-password");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Log audit trail
  await auditLogger.logUserAction(
    "USER_STATUS_CHANGED",
    req.user,
    user._id,
    { ip: req.ip, userAgent: req.headers["user-agent"] },
    !isActive,
    isActive
  );

  res.status(200).json({
    success: true,
    message: `User ${isActive ? "activated" : "deactivated"} successfully`,
    user,
  });
});

// @desc    Get inventory report
// @route   GET /api/admin/inventory
// @access  Private/Admin
exports.getInventoryReport = asyncHandler(async (req, res) => {
  // Out of stock products
  const outOfStock = await Product.find({ totalStock: 0 })
    .populate("category", "name")
    .select("name sku totalStock category");

  // Low stock products (less than 10)
  const lowStock = await Product.find({
    totalStock: { $gt: 0, $lt: 10 },
  })
    .populate("category", "name")
    .select("name sku totalStock category");

  // High stock products (more than 100)
  const highStock = await Product.find({ totalStock: { $gt: 100 } })
    .populate("category", "name")
    .select("name sku totalStock category");

  // Stock by category
  const stockByCategory = await Product.aggregate([
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryInfo",
      },
    },
    {
      $group: {
        _id: "$categoryInfo.name",
        totalProducts: { $sum: 1 },
        totalStock: { $sum: "$totalStock" },
        averageStock: { $avg: "$totalStock" },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    inventory: {
      outOfStock: outOfStock.length,
      lowStock: lowStock.length,
      highStock: highStock.length,
      outOfStockProducts: outOfStock,
      lowStockProducts: lowStock,
      stockByCategory,
    },
  });
});

// @desc    Get sales report
// @route   GET /api/admin/sales
// @access  Private/Admin
exports.getSalesReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, period = "month" } = req.query;

  let matchCondition = { "payment.status": "completed" };

  if (startDate && endDate) {
    matchCondition.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  // Sales by period
  let groupBy;
  switch (period) {
    case "day":
      groupBy = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };
      break;
    case "week":
      groupBy = {
        year: { $year: "$createdAt" },
        week: { $week: "$createdAt" },
      };
      break;
    default:
      groupBy = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      };
  }

  const salesByPeriod = await Order.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: groupBy,
        totalSales: { $sum: "$total" },
        totalOrders: { $sum: 1 },
        averageOrderValue: { $avg: "$total" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  ]);

  // Top selling products
  const topSellingProducts = await Order.aggregate([
    { $match: matchCondition },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        totalQuantity: { $sum: "$items.quantity" },
        totalRevenue: { $sum: "$items.totalPrice" },
        productName: { $first: "$items.productName" },
      },
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: 10 },
  ]);

  // Sales summary
  const salesSummary = await Order.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$total" },
        totalOrders: { $sum: 1 },
        averageOrderValue: { $avg: "$total" },
        totalItemsSold: { $sum: { $sum: "$items.quantity" } },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    salesReport: {
      summary: salesSummary[0] || {},
      salesByPeriod,
      topSellingProducts,
    },
  });
});

// @desc    Update product stock (Admin)
// @route   PUT /api/admin/products/:id/stock
// @access  Private/Admin
exports.updateProductStock = asyncHandler(async (req, res) => {
  const { variants } = req.body;

  // Validate input
  if (!variants || !Array.isArray(variants) || variants.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Variants array is required",
    });
  }

  console.log("📦 Updating stock for product ID:", req.params.id);
  console.log("📦 Received variants update:", variants);

  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  // 🔔 STORE ORIGINAL STOCK FOR NOTIFICATION CHECK
  const originalTotalStock = product.totalStock;
  console.log("📋 Original totalStock:", originalTotalStock);

  console.log("📦 Current product:", product.name);
  console.log("📦 Current totalStock BEFORE update:", product.totalStock);
  console.log(
    "📦 Current variants BEFORE update:",
    product.variants.map((v) => ({
      size: v.size,
      color: v.color.name,
      stock: v.stock,
    }))
  );

  // Update variant stocks
  let updatedCount = 0;
  variants.forEach((variantUpdate) => {
    const variant = product.variants.find(
      (v) =>
        v.size === variantUpdate.size && v.color.name === variantUpdate.color
    );

    if (variant) {
      console.log(
        `✏️  Updating ${variant.size} ${variant.color.name}: ${variant.stock} -> ${variantUpdate.stock}`
      );
      variant.stock = parseInt(variantUpdate.stock) || 0;
      updatedCount++;
    } else {
      console.log(
        `❌ Variant not found: ${variantUpdate.size} ${variantUpdate.color}`
      );
    }
  });

  if (updatedCount === 0) {
    return res.status(400).json({
      success: false,
      message: "No matching variants found to update",
    });
  }

  console.log(
    "📦 Variants AFTER manual update:",
    product.variants.map((v) => ({
      size: v.size,
      color: v.color.name,
      stock: v.stock,
    }))
  );

  // Manually calculate totalStock BEFORE save
  const calculatedTotal = product.variants.reduce((total, variant) => {
    return total + (variant.stock || 0);
  }, 0);
  console.log("🧮 Manually calculated totalStock:", calculatedTotal);

  // Explicitly set totalStock (in case pre-save hook fails)
  product.totalStock = calculatedTotal;

  console.log("💾 Calling product.save()...");

  // Mark the variants path as modified to ensure pre-save hooks run
  product.markModified("variants");
  product.markModified("totalStock");

  // Save the product
  await product.save();

  console.log("✅ Save completed");
  console.log("📦 Product totalStock AFTER save:", product.totalStock);

  // VERIFY: Fetch from database to confirm it was saved
  const verifyProduct = await Product.findById(product._id).lean();
  console.log("🔍 VERIFY - Database totalStock:", verifyProduct.totalStock);
  console.log(
    "🔍 VERIFY - Database variants:",
    verifyProduct.variants.map((v) => ({
      size: v.size,
      color: v.color.name,
      stock: v.stock,
    }))
  );

  // Double check they match
  if (verifyProduct.totalStock !== calculatedTotal) {
    console.error(
      "⚠️  WARNING: Database totalStock does not match calculated value!"
    );
    console.error("   Expected:", calculatedTotal);
    console.error("   Got:", verifyProduct.totalStock);
  } else {
    console.log("✅ Verification passed - database has correct stock");
  }

  // 🔔 TRIGGER BACK IN STOCK NOTIFICATION
  // Check if product was out of stock (0) and now has stock
  const wasOutOfStock = originalTotalStock === 0;
  const nowInStock = verifyProduct.totalStock > 0;

  if (wasOutOfStock && nowInStock) {
    console.log(
      `🔔 Product back in stock: ${product.name} (${originalTotalStock} → ${verifyProduct.totalStock})`
    );

    // Trigger back in stock notification asynchronously
    sendBackInStockNotification(product._id)
      .then((result) => {
        console.log(
          `✅ Back in stock notifications sent: ${result.sent} emails`
        );
      })
      .catch((error) => {
        console.error("❌ Error sending back in stock notifications:", error);
      });
  } else {
    console.log("📊 Stock update check:");
    console.log("   - Was out of stock?", wasOutOfStock);
    console.log("   - Now in stock?", nowInStock);
    console.log("   - Notification triggered? NO");
  }

  // Populate category for response
  await product.populate("category", "name slug");

  // Return the VERIFIED data from database
  res.status(200).json({
    success: true,
    message: `Stock updated successfully for ${updatedCount} variant(s)`,
    product: {
      _id: verifyProduct._id,
      name: verifyProduct.name,
      sku: verifyProduct.sku,
      totalStock: verifyProduct.totalStock, // Use verified value from DB
      variants: verifyProduct.variants, // Use verified values from DB
      category: product.category,
      price: verifyProduct.price,
      salePrice: verifyProduct.salePrice,
      status: verifyProduct.status,
      images: verifyProduct.images,
      brand: verifyProduct.brand,
      featured: verifyProduct.featured,
      isNewArrival: verifyProduct.isNewArrival,
      updatedAt: verifyProduct.updatedAt,
    },
    updatedCount,
  });
});

// @desc    Bulk update products
// @route   PUT /api/admin/products/bulk-update
// @access  Private/Admin
exports.bulkUpdateProducts = asyncHandler(async (req, res) => {
  const { productIds, updates } = req.body;

  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Product IDs array is required",
    });
  }

  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Updates object is required",
    });
  }

  // Validate allowed update fields
  const allowedFields = ["status", "isFeatured", "isNewArrival", "category"];
  const updateFields = {};

  Object.keys(updates).forEach((key) => {
    if (allowedFields.includes(key)) {
      updateFields[key] = updates[key];
    }
  });

  if (Object.keys(updateFields).length === 0) {
    return res.status(400).json({
      success: false,
      message: "No valid update fields provided",
    });
  }

  const result = await Product.updateMany(
    { _id: { $in: productIds } },
    { $set: updateFields }
  );

  // Log audit trail
  await auditLogger.logProductAction("BULK_UPDATE", req.user, null, {
    productCount: productIds.length,
    updates: updateFields,
  });

  res.status(200).json({
    success: true,
    message: `${result.modifiedCount} products updated successfully`,
    modifiedCount: result.modifiedCount,
  });
});

// @desc    Bulk delete products
// @route   DELETE /api/admin/products/bulk-delete
// @access  Private/Admin
exports.bulkDeleteProducts = asyncHandler(async (req, res) => {
  const { productIds, deleteType = "soft" } = req.body;

  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Product IDs array is required",
    });
  }

  let result;

  if (deleteType === "hard") {
    // Hard delete - permanently remove from database
    result = await Product.deleteMany({ _id: { $in: productIds } });

    await auditLogger.logProductAction("PRODUCT_DELETED", req.user, null, {
      deleteType: "hard",
      productCount: productIds.length,
    });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} products permanently deleted`,
      deletedCount: result.deletedCount,
    });
  } else {
    // Soft delete - change status to deleted
    result = await Product.updateMany(
      { _id: { $in: productIds } },
      {
        $set: {
          status: "deleted",
          deletedAt: new Date(),
        },
      }
    );

    await auditLogger.logProductAction("PRODUCT_DELETED", req.user, null, {
      deleteType: "soft",
      productCount: productIds.length,
    });

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} products marked as deleted`,
      modifiedCount: result.modifiedCount,
    });
  }
});

// @desc    Update single product status
// @route   PUT /api/admin/products/:id/status
// @access  Private/Admin
exports.updateProductStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      message: "Status is required",
    });
  }

  const validStatuses = ["active", "inactive", "draft", "discontinued"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status value",
    });
  }

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Product status updated successfully",
    product,
  });
});

// @desc    Duplicate product
// @route   POST /api/admin/products/:id/duplicate
// @access  Private/Admin
exports.duplicateProduct = asyncHandler(async (req, res) => {
  const originalProduct = await Product.findById(req.params.id);

  if (!originalProduct) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  // Generate new SKU
  const generateNewSKU = () => {
    return `${originalProduct.sku}-COPY-${Date.now().toString().slice(-6)}`;
  };

  // Generate new slug
  const generateNewSlug = (originalSlug) => {
    return `${originalSlug}-copy-${Date.now().toString().slice(-6)}`;
  };

  // Create duplicate with modified fields
  const duplicateData = {
    ...originalProduct.toObject(),
    _id: undefined,
    __v: undefined,
    name: `${originalProduct.name} - Copy`,
    sku: generateNewSKU(),
    slug: generateNewSlug(originalProduct.slug),
    status: "draft",
    isFeatured: false,
    isNewArrival: false,
    views: 0,
    purchases: 0,
    revenue: 0,
    averageRating: 0,
    reviewCount: 0,
    createdAt: undefined,
    updatedAt: undefined,
  };

  // Reset stock for all variants
  if (duplicateData.variants) {
    duplicateData.variants = duplicateData.variants.map((variant) => ({
      ...variant,
      stock: 0,
      variantSku: `${duplicateData.sku}-${
        variant.size
      }-${variant.color.name.toUpperCase()}`,
    }));
  }

  const duplicatedProduct = new Product(duplicateData);
  await duplicatedProduct.save();

  res.status(201).json({
    success: true,
    message: "Product duplicated successfully",
    product: duplicatedProduct,
  });
});

// @desc    Export products to CSV
// @route   GET /api/admin/products/export
// @access  Private/Admin
exports.exportProducts = asyncHandler(async (req, res) => {
  // Use same filtering logic as getProducts
  let query = {};

  // Apply filters from query parameters
  if (req.query.category) {
    const category = await Category.findOne({ slug: req.query.category });
    if (category) {
      query.category = category._id;
    }
  }

  if (req.query.status) {
    query.status = req.query.status;
  }

  if (req.query.featured !== undefined) {
    query.isFeatured = req.query.featured === "true";
  }

  if (req.query.newArrival !== undefined) {
    query.isNewArrival = req.query.newArrival === "true";
  }

  if (req.query.brand) {
    query.brand = new RegExp(req.query.brand, "i");
  }

  if (req.query.minPrice || req.query.maxPrice) {
    query.price = {};
    if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice);
    if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
  }

  if (req.query.startDate || req.query.endDate) {
    query.createdAt = {};
    if (req.query.startDate)
      query.createdAt.$gte = new Date(req.query.startDate);
    if (req.query.endDate) query.createdAt.$lte = new Date(req.query.endDate);
  }

  const products = await Product.find(query)
    .populate("category", "name")
    .sort({ createdAt: -1 });

  // Generate CSV data
  const csvData = products.map((product) => ({
    ID: product._id,
    Name: product.name,
    SKU: product.sku,
    Brand: product.brand,
    Category: product.category?.name || "No Category",
    Price: product.price,
    "Sale Price": product.salePrice || "",
    Status: product.status,
    Featured: product.isFeatured ? "Yes" : "No",
    "New Arrival": product.isNewArrival ? "Yes" : "No",
    "Total Stock": product.totalStock,
    Views: product.views,
    Purchases: product.purchases,
    Revenue: product.revenue,
    "Average Rating": product.averageRating,
    "Review Count": product.reviewCount,
    "Created Date": product.createdAt.toISOString().split("T")[0],
    "Updated Date": product.updatedAt.toISOString().split("T")[0],
  }));

  // Convert to CSV string
  csv(
    csvData,
    {
      header: true,
      columns: Object.keys(csvData[0] || {}),
    },
    (err, csvString) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Error generating CSV",
        });
      }

      const filename = `products-export-${
        new Date().toISOString().split("T")[0]
      }.csv`;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.send(csvString);
    }
  );
});

// @desc    Get enhanced products with admin filters
// @route   GET /api/admin/products
// @access  Private/Admin
exports.getAdminProducts = asyncHandler(async (req, res) => {
  // Build query with enhanced admin filters
  let query = {};

  // Category filter
  if (req.query.category) {
    const category = await Category.findOne({ slug: req.query.category });
    if (category) {
      query.category = category._id;
    }
  }

  // Status filter (including deleted for admin)
  if (req.query.status) {
    query.status = req.query.status;
  }

  // Featured filter
  if (req.query.featured !== undefined) {
    query.isFeatured = req.query.featured === "true";
  }

  // New arrival filter
  if (req.query.newArrival !== undefined) {
    query.isNewArrival = req.query.newArrival === "true";
  }

  // Brand filter
  if (req.query.brand) {
    query.brand = new RegExp(req.query.brand, "i");
  }

  // Price range filter
  if (req.query.minPrice || req.query.maxPrice) {
    query.price = {};
    if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice);
    if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
  }

  // Date range filter
  if (req.query.startDate || req.query.endDate) {
    query.createdAt = {};
    if (req.query.startDate)
      query.createdAt.$gte = new Date(req.query.startDate);
    if (req.query.endDate) query.createdAt.$lte = new Date(req.query.endDate);
  }

  // Stock level filter
  if (req.query.stockLevel) {
    switch (req.query.stockLevel) {
      case "out_of_stock":
        query.totalStock = 0;
        break;
      case "low_stock":
        query.totalStock = { $gt: 0, $lt: 10 };
        break;
      case "in_stock":
        query.totalStock = { $gte: 10 };
        break;
    }
  }

  // Search
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { sku: { $regex: req.query.search, $options: "i" } },
      { brand: { $regex: req.query.search, $options: "i" } },
    ];
  }

  // Create mongoose query
  let mongooseQuery = Product.find(query);

  // Sorting
  const sortBy = req.query.sort || "createdAt";
  const sortOrder = req.query.order === "asc" ? 1 : -1;
  const sortObj = {};
  sortObj[sortBy] = sortOrder;
  mongooseQuery = mongooseQuery.sort(sortObj);

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;

  mongooseQuery = mongooseQuery.skip(startIndex).limit(limit);
  mongooseQuery = mongooseQuery.populate("category", "name slug");

  const products = await mongooseQuery;
  const total = await Product.countDocuments(query);

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
});

// @desc    Get all orders (Admin only)
// @route   GET /api/admin/orders
// @access  Private/Admin
exports.getAllOrders = asyncHandler(async (req, res) => {
  let query = {};

  // ------------------------------
  // 1️⃣ SEARCH FILTER
  // ------------------------------
  if (req.query.search) {
    const users = await User.find({
      $or: [
        { firstName: { $regex: req.query.search, $options: "i" } },
        { lastName: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
      ],
    }).select("_id");

    const userIds = users.map((user) => user._id);

    query.$or = [
      { orderNumber: { $regex: req.query.search, $options: "i" } },
      { user: { $in: userIds } },
    ];
  }

  // ------------------------------
  // 2️⃣ ORDER STATUS FILTER
  //------------------------------
  if (req.query.status && req.query.status !== "all") {
    query.status = req.query.status;
  }

  // ------------------------------
  // 3️⃣ DATE RANGE FILTER
  // ------------------------------
  if (req.query.startDate || req.query.endDate) {
    query.createdAt = {};
    if (req.query.startDate)
      query.createdAt.$gte = new Date(req.query.startDate);
    if (req.query.endDate) {
      const endDate = new Date(req.query.endDate);
      endDate.setDate(endDate.getDate() + 1);
      query.createdAt.$lt = endDate;
    }
  }

  // ------------------------------
  // 4️⃣ AMOUNT RANGE FILTER
  // ------------------------------
  if (req.query.minAmount || req.query.maxAmount) {
    query.total = {};
    if (req.query.minAmount) query.total.$gte = Number(req.query.minAmount);
    if (req.query.maxAmount) query.total.$lte = Number(req.query.maxAmount);
  }

  // ------------------------------
  // 5️⃣ PAYMENT METHOD FILTER (NEW)
  // ------------------------------
  if (req.query.paymentMethod && req.query.paymentMethod !== "all") {
    if (req.query.paymentMethod === "cod") {
      query.$or = [
        { paymentMethod: "cod" },
        { "payment.method": "cash_on_delivery" },
      ];
    } else if (req.query.paymentMethod === "razorpay") {
      query.$or = [
        { paymentMethod: "razorpay" },
        { "payment.method": { $ne: "cash_on_delivery" } },
      ];
    }
  }

  // ------------------------------
  // 6️⃣ RETURN REQUEST FILTER (NEW)
  // ------------------------------
  if (req.query.returnStatus && req.query.returnStatus !== "all") {
    query.returnRequested = true;

    // Example: ?returnStatus=requested
    if (req.query.returnStatus === "requested") {
      query.returnStatus = "requested";
    } else {
      query.returnStatus = req.query.returnStatus;
    }
  }

  console.log("Orders query:", JSON.stringify(query, null, 2));

  // ------------------------------
  // EXECUTE QUERY
  // ------------------------------
  let mongooseQuery = Order.find(query);

  // Sort newest first
  mongooseQuery = mongooseQuery.sort({ createdAt: -1 });

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;

  mongooseQuery = mongooseQuery.skip(startIndex).limit(limit);

  // Populate user info
  mongooseQuery = mongooseQuery.populate(
    "user",
    "firstName lastName email phone"
  );

  try {
    const orders = await mongooseQuery;
    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        limit,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
      orders,
    });
  } catch (error) {
    console.error("Orders query error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
    });
  }
});

// @desc    Get order details (Admin only)
// @route   GET /api/admin/orders/:id
// @access  Private/Admin
exports.getOrderDetails = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "firstName lastName email phone")
    .populate({
      path: "items.product",
      select: "name images",
    });

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  res.status(200).json({
    success: true,
    order,
  });
});

// @desc    Update order status (Admin only)
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  // Validate status
  const validStatuses = [
    "pending",
    "confirmed",
    "shipped",
    "delivered",
    "cancelled",
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status value",
    });
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  // ✅ NEW: Store old status to detect changes
  const oldStatus = order.status;

  // Update status
  order.status = status;

  // Add timestamps for certain status changes
  if (status === "confirmed") {
    order.confirmedAt = new Date();
  } else if (status === "shipped") {
    order.shippedAt = new Date();
  } else if (status === "delivered") {
    order.deliveredAt = new Date();
  } else if (status === "cancelled") {
    order.cancelledAt = new Date();
  }

  await order.save();

  // Populate for response
  await order.populate("user", "firstName lastName email");

  // ✅ NEW: Send status update email to customer
  if (oldStatus !== status && order.user) {
    try {
      const emailService = require("../utils/emailService");
      await emailService.sendOrderStatusUpdate(order, order.user, status);
      console.log(
        `✅ Status update email sent to ${order.user.email} (${oldStatus} → ${status})`
      );
    } catch (emailError) {
      console.error("Failed to send status update email:", emailError);
      // Don't fail the status update if email fails
    }
  }

  res.status(200).json({
    success: true,
    message: "Order status updated successfully",
    order,
  });
});

// @desc    Get order statistics (Admin only)
// @route   GET /api/admin/orders/stats
// @access  Private/Admin
exports.getOrderStats = asyncHandler(async (req, res) => {
  try {
    // Get total orders count
    const total = await Order.countDocuments();

    // Get orders by status
    const statusCounts = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert to object for easier access
    const statusStats = {};
    statusCounts.forEach((item) => {
      statusStats[item._id] = item.count;
    });

    // Get total revenue
    const revenueResult = await Order.aggregate([
      {
        $match: {
          status: { $nin: ["cancelled"] },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
        },
      },
    ]);

    const totalRevenue =
      revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    const stats = {
      total,
      pending: statusStats.pending || 0,
      confirmed: statusStats.confirmed || 0,
      shipped: statusStats.shipped || 0,
      delivered: statusStats.delivered || 0,
      cancelled: statusStats.cancelled || 0,
      totalRevenue,
    };

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching order stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching order statistics",
    });
  }
});

// @desc    Export orders (Admin only)
// @route   GET /api/admin/orders/export
// @access  Private/Admin
exports.exportOrders = asyncHandler(async (req, res) => {
  try {
    // Build query (similar to getAllOrders)
    let query = {};

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate);
        endDate.setDate(endDate.getDate() + 1);
        query.createdAt.$lt = endDate;
      }
    }

    // Get all orders matching criteria
    const orders = await Order.find(query)
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 });

    // Generate CSV headers
    const headers = [
      "Order Number",
      "Customer Name",
      "Customer Email",
      "Order Date",
      "Status",
      "Items Count",
      "Subtotal",
      "Shipping",
      "Tax",
      "Discount",
      "Total",
      "Payment Method",
      "Payment Status",
    ];

    // Generate CSV rows
    const rows = orders.map((order) => [
      order.orderNumber,
      `${order.user?.firstName || ""} ${order.user?.lastName || ""}`.trim(),
      order.user?.email || "",
      new Date(order.createdAt).toLocaleDateString(),
      order.status,
      order.items.length,
      order.subtotal || 0,
      order.shippingCost || 0,
      order.tax || 0,
      order.discount || 0,
      order.total,
      order.paymentMethod || "",
      order.paymentStatus || "",
    ]);

    // Create CSV content
    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    // Set headers for file download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=orders-export-${
        new Date().toISOString().split("T")[0]
      }.csv`
    );

    res.status(200).send(csvContent);
  } catch (error) {
    console.error("Error exporting orders:", error);
    res.status(500).json({
      success: false,
      message: "Error exporting orders",
    });
  }
});

// @desc    Get sales report (Admin only)
// @route   GET /api/admin/reports/sales
// @access  Private/Admin
exports.getSalesReport = asyncHandler(async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Calculate previous period for growth comparison
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);

    // Get current period sales data
    const salesStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $nin: ["cancelled"] },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: "$total" },
        },
      },
    ]);

    // Get previous period sales data for growth calculation
    const previousSalesStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: previousStartDate, $lt: startDate },
          status: { $nin: ["cancelled"] },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const stats = salesStats[0] || {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
    };

    const prevStats = previousSalesStats[0] || {
      totalRevenue: 0,
      totalOrders: 0,
    };

    // Calculate real growth percentages
    const revenueGrowth =
      prevStats.totalRevenue > 0
        ? ((stats.totalRevenue - prevStats.totalRevenue) /
            prevStats.totalRevenue) *
          100
        : 0;

    const ordersGrowth =
      prevStats.totalOrders > 0
        ? ((stats.totalOrders - prevStats.totalOrders) /
            prevStats.totalOrders) *
          100
        : 0;

    // Get top products with real growth data
    const topProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $nin: ["cancelled"] },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          sales: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.totalPrice" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $project: {
          name: "$productInfo.name",
          image: { $arrayElemAt: ["$productInfo.images.url", 0] },
          sales: 1,
          revenue: 1,
        },
      },
    ]);

    // Get sales by category
    const salesByCategory = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $nin: ["cancelled"] },
        },
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: "categories",
          localField: "product.category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $group: {
          _id: "$category._id",
          name: { $first: "$category.name" },
          revenue: { $sum: "$items.totalPrice" },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    // Get sales by month (for charts)
    const salesByMonth = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $nin: ["cancelled"] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          month: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              { $toString: "$_id.month" },
            ],
          },
          revenue: 1,
          orders: 1,
        },
      },
    ]);

    // Get recent high-value transactions
    const recentTransactions = await Order.find({
      createdAt: { $gte: startDate },
      status: { $nin: ["cancelled"] },
    })
      .sort({ total: -1 })
      .limit(10)
      .populate("user", "firstName lastName email")
      .select("orderNumber total status createdAt user");

    // Calculate conversion rate (orders / total site visitors - placeholder)
    // You would need to track site visitors separately
    const conversionRate = 3.5; // Placeholder

    res.status(200).json({
      success: true,
      totalRevenue: stats.totalRevenue,
      totalOrders: stats.totalOrders,
      averageOrderValue: stats.averageOrderValue,
      revenueGrowth,
      ordersGrowth,
      conversionRate,
      topProducts,
      salesByCategory,
      salesByMonth,
      recentTransactions: recentTransactions.map((order) => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        customerName: order.user
          ? `${order.user.firstName} ${order.user.lastName}`
          : "Guest",
        amount: order.total,
        date: order.createdAt,
        status: order.status,
      })),
    });
  } catch (error) {
    console.error("Sales report error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating sales report",
      error: error.message,
    });
  }
});

// @desc    Get inventory report (Admin only)
// @route   GET /api/admin/reports/inventory
// @access  Private/Admin
exports.getInventoryReport = asyncHandler(async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const lowStockItems = await Product.countDocuments({
      totalStock: { $lt: 10, $gt: 0 },
    });
    const outOfStockItems = await Product.countDocuments({ totalStock: 0 });

    const stockValue = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ["$price", "$totalStock"] } },
        },
      },
    ]);

    const stockAlerts = await Product.find({
      $or: [{ totalStock: { $lt: 5 } }, { totalStock: 0 }],
    }).limit(10);

    const fastMovingProducts = await Product.find()
      .sort({ purchases: -1 })
      .limit(10)
      .select("name purchases");

    const slowMovingProducts = await Product.find({
      purchases: { $lt: 5 },
    })
      .limit(10)
      .select("name createdAt");

    res.status(200).json({
      success: true,
      totalProducts,
      lowStockItems,
      outOfStockItems,
      totalStockValue: stockValue[0]?.totalValue || 0,
      stockAlerts: stockAlerts.map((product) => ({
        _id: product._id,
        productName: product.name,
        currentStock: product.totalStock,
        level: product.totalStock === 0 ? "critical" : "warning",
        message: product.totalStock === 0 ? "Out of stock" : "Low stock alert",
      })),
      fastMovingProducts: fastMovingProducts.map((product) => ({
        _id: product._id,
        name: product.name,
        velocity: Math.round(product.purchases / 30) || 1,
      })),
      slowMovingProducts: slowMovingProducts.map((product) => ({
        _id: product._id,
        name: product.name,
        daysInStock: Math.floor(
          (new Date() - product.createdAt) / (1000 * 60 * 60 * 24)
        ),
      })),
    });
  } catch (error) {
    console.error("Inventory report error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating inventory report",
    });
  }
});

// @desc    Get audit logs
// @route   GET /api/admin/audit-logs
// @access  Private/Admin
exports.getAuditLogs = asyncHandler(async (req, res) => {
  const {
    userId,
    action,
    resource,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = req.query;

  const result = await auditLogger.getAuditLogs(
    { userId, action, resource, startDate, endDate },
    { page: parseInt(page), limit: parseInt(limit) }
  );

  res.status(200).json({
    success: true,
    ...result,
  });
});

// @desc    Get inventory alerts
// @route   GET /api/admin/inventory/alerts
// @access  Private/Admin
exports.getInventoryAlerts = asyncHandler(async (req, res) => {
  const alerts = await inventoryMonitor.checkAllProducts();
  const report = await inventoryMonitor.getInventoryReport();

  res.status(200).json({
    success: true,
    alerts: alerts.filter((a) => a.level === "critical"),
    summary: {
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter((a) => a.level === "critical").length,
      lowStockAlerts: alerts.filter((a) => a.level === "low").length,
      outOfStock: report.outOfStock,
      criticalStock: report.criticalStock,
      lowStock: report.lowStock,
    },
    report,
  });
});

// @desc    Get stock prediction for a product
// @route   GET /api/admin/inventory/prediction/:productId
// @access  Private/Admin
exports.getStockPrediction = asyncHandler(async (req, res) => {
  const prediction = await inventoryMonitor.predictStockout(
    req.params.productId
  );

  if (!prediction) {
    return res.status(404).json({
      success: false,
      message: "Unable to generate prediction - insufficient data",
    });
  }

  res.status(200).json({
    success: true,
    prediction,
  });
});

// @desc    Get customers report (Admin only)
// @route   GET /api/admin/reports/customers
// @access  Private/Admin
exports.getCustomersReport = asyncHandler(async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Calculate previous period for growth comparison
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);

    // Get total customers (using 'customer' role, not 'user')
    const totalCustomers = await User.countDocuments({ role: "customer" });

    // Get new customers in current period
    const newCustomers = await User.countDocuments({
      role: "customer",
      createdAt: { $gte: startDate },
    });

    // Get new customers in previous period for growth calculation
    const previousNewCustomers = await User.countDocuments({
      role: "customer",
      createdAt: { $gte: previousStartDate, $lt: startDate },
    });

    // Calculate real customer growth
    const customerGrowth =
      previousNewCustomers > 0
        ? ((newCustomers - previousNewCustomers) / previousNewCustomers) * 100
        : 0;

    // Get repeat customers (customers with more than 1 order)
    const repeatCustomers = await Order.aggregate([
      {
        $group: {
          _id: "$user",
          orderCount: { $sum: 1 },
        },
      },
      {
        $match: { orderCount: { $gt: 1 } },
      },
      {
        $count: "repeatCustomers",
      },
    ]);

    // Get top customers by spending
    const topCustomers = await Order.aggregate([
      {
        $group: {
          _id: "$user",
          totalSpent: { $sum: "$total" },
          totalOrders: { $sum: 1 },
          lastOrder: { $max: "$createdAt" },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
      {
        $project: {
          name: { $concat: ["$userInfo.firstName", " ", "$userInfo.lastName"] },
          email: "$userInfo.email",
          totalSpent: 1,
          totalOrders: 1,
          lastOrder: 1,
        },
      },
    ]);

    // Get customers by location
    const customersByLocation = await User.aggregate([
      { $match: { role: "customer" } },
      { $unwind: { path: "$addresses", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: {
            city: "$addresses.city",
            state: "$addresses.state",
          },
          count: { $sum: 1 },
        },
      },
      { $match: { "_id.city": { $ne: null }, "_id.state": { $ne: null } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: { $concat: ["$_id.city", ", ", "$_id.state"] },
          city: "$_id.city",
          state: "$_id.state",
          count: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      totalCustomers,
      newCustomers,
      repeatCustomers: repeatCustomers[0]?.repeatCustomers || 0,
      customerGrowth,
      topCustomers,
      customersByLocation,
      acquisitionChannels: [], // Placeholder - would need tracking implementation
    });
  } catch (error) {
    console.error("Customers report error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating customers report",
      error: error.message,
    });
  }
});

// @desc    Get reviews statistics (Admin)
// @route   GET /api/admin/reviews/stats
// @access  Private/Admin
exports.getReviewStats = asyncHandler(async (req, res) => {
  const totalReviews = await Review.countDocuments();
  const pendingReviews = await Review.countDocuments({ status: "pending" });
  const flaggedReviews = await Review.countDocuments({ status: "flagged" });

  const ratingDistribution = await Review.aggregate([
    { $match: { status: "approved" } },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const averageRating = await Review.aggregate([
    { $match: { status: "approved" } },
    {
      $group: {
        _id: null,
        average: { $avg: "$rating" },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    stats: {
      totalReviews,
      pendingReviews,
      flaggedReviews,
      averageRating: averageRating[0]?.average || 0,
      ratingDistribution,
    },
  });
});

// @desc    Get notification settings
// @route   GET /api/admin/settings/notifications
// @access  Private/Admin
exports.getNotificationSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("notificationSettings");

  res.status(200).json({
    success: true,
    settings: user.notificationSettings || {
      emailNotifications: true,
      orderUpdates: true,
      newUsers: true,
      lowStock: true,
      salesReports: false,
      systemUpdates: true,
    },
  });
});

// @desc    Update notification settings
// @route   PUT /api/admin/settings/notifications
// @access  Private/Admin
exports.updateNotificationSettings = asyncHandler(async (req, res) => {
  const { notificationSettings } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { notificationSettings },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: "Notification settings updated",
    settings: user.notificationSettings,
  });
});

// @desc    Get store settings
// @route   GET /api/admin/settings/store
// @access  Private/Admin
exports.getStoreSettings = asyncHandler(async (req, res) => {
  const settings = await StoreSettings.getSettings();

  res.status(200).json({
    success: true,
    settings,
  });
});

// @desc    Update store settings
// @route   PUT /api/admin/settings/store
// @access  Private/Admin
exports.updateStoreSettings = asyncHandler(async (req, res) => {
  const {
    storeName,
    storeDescription,
    currency,
    timezone,
    language,
    taxRate,
    freeShippingThreshold,
    standardShippingCost,
    expressShippingCost,
    businessInfo,
    features,
  } = req.body;

  // Validate numeric fields
  if (taxRate !== undefined && (taxRate < 0 || taxRate > 100)) {
    return res.status(400).json({
      success: false,
      message: "Tax rate must be between 0 and 100",
    });
  }

  if (freeShippingThreshold !== undefined && freeShippingThreshold < 0) {
    return res.status(400).json({
      success: false,
      message: "Free shipping threshold cannot be negative",
    });
  }

  if (standardShippingCost !== undefined && standardShippingCost < 0) {
    return res.status(400).json({
      success: false,
      message: "Standard shipping cost cannot be negative",
    });
  }

  if (expressShippingCost !== undefined && expressShippingCost < 0) {
    return res.status(400).json({
      success: false,
      message: "Express shipping cost cannot be negative",
    });
  }

  // Build update object with only provided fields
  const updates = {};
  if (storeName !== undefined) updates.storeName = storeName;
  if (storeDescription !== undefined)
    updates.storeDescription = storeDescription;
  if (currency !== undefined) updates.currency = currency;
  if (timezone !== undefined) updates.timezone = timezone;
  if (language !== undefined) updates.language = language;
  if (taxRate !== undefined) updates.taxRate = taxRate;
  if (freeShippingThreshold !== undefined)
    updates.freeShippingThreshold = freeShippingThreshold;
  if (standardShippingCost !== undefined)
    updates.standardShippingCost = standardShippingCost;
  if (expressShippingCost !== undefined)
    updates.expressShippingCost = expressShippingCost;
  if (businessInfo !== undefined) updates.businessInfo = businessInfo;
  if (features !== undefined) updates.features = features;

  const settings = await StoreSettings.updateSettings(updates, req.user._id);

  // Log the change
  await auditLogger.log({
    userId: req.user._id,
    action: "UPDATE_STORE_SETTINGS",
    resource: "store_settings",
    resourceId: settings._id,
    details: {
      updates: Object.keys(updates),
    },
  });

  res.status(200).json({
    success: true,
    message: "Store settings updated successfully",
    settings,
  });
});

const exportReport = async (req, res) => {
  try {
    const { reportType } = req.params;
    const queryParams = req.query;

    console.log(`Exporting ${reportType} report with params:`, queryParams);

    let csvData = "";
    let filename = "";

    switch (reportType) {
      case "sales":
        const salesData = await generateSalesReportData(queryParams);
        csvData = convertSalesDataToCSV(salesData);
        filename = `sales-report-${new Date().toISOString().split("T")[0]}.csv`;
        break;

      case "inventory":
        const inventoryData = await generateInventoryReportData();
        csvData = convertInventoryDataToCSV(inventoryData);
        filename = `inventory-report-${
          new Date().toISOString().split("T")[0]
        }.csv`;
        break;

      case "customers":
        const customersData = await generateCustomersReportData(queryParams);
        csvData = convertCustomersDataToCSV(customersData);
        filename = `customers-report-${
          new Date().toISOString().split("T")[0]
        }.csv`;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid report type",
        });
    }

    // Set headers for CSV download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-cache");

    // Send CSV data
    res.send(csvData);
  } catch (error) {
    console.error("Export report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export report",
    });
  }
};

// Helper function to generate sales report data
const generateSalesReportData = async (params) => {
  const { days = 30 } = params;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  // Get orders for the date range
  const orders = await Order.find({
    createdAt: { $gte: startDate },
    status: { $ne: "cancelled" },
  })
    .populate("user", "firstName lastName email")
    .populate("items.product", "name brand category")
    .sort({ createdAt: -1 });

  return orders;
};

// Helper function to convert sales data to CSV
const convertSalesDataToCSV = (orders) => {
  const headers = [
    "Order Number",
    "Date",
    "Customer Name",
    "Customer Email",
    "Items Count",
    "Subtotal",
    "Shipping",
    "Tax",
    "Total",
    "Status",
    "Payment Method",
  ];

  let csv = headers.join(",") + "\n";

  orders.forEach((order) => {
    const row = [
      order.orderNumber || "",
      new Date(order.createdAt).toLocaleDateString(),
      `${order.user?.firstName || ""} ${order.user?.lastName || ""}`.trim(),
      order.user?.email || "",
      order.items?.length || 0,
      order.subtotal || 0,
      order.shippingCost || 0,
      order.tax || 0,
      order.total || 0,
      order.status || "",
      order.paymentMethod || "",
    ];

    // Escape commas in data and wrap in quotes if necessary
    const escapedRow = row.map((field) => {
      const str = String(field);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });

    csv += escapedRow.join(",") + "\n";
  });

  return csv;
};

// Helper function to generate inventory report data
const generateInventoryReportData = async () => {
  const products = await Product.find({})
    .populate("category", "name")
    .sort({ name: 1 });

  return products;
};

// Helper function to convert inventory data to CSV
const convertInventoryDataToCSV = (products) => {
  const headers = [
    "Product Name",
    "Brand",
    "Category",
    "SKU",
    "Price",
    "Sale Price",
    "Total Stock",
    "Status",
    "Created Date",
  ];

  let csv = headers.join(",") + "\n";

  products.forEach((product) => {
    // Calculate total stock across all variants
    const totalStock =
      product.variants?.reduce(
        (sum, variant) => sum + (variant.stock || 0),
        0
      ) || 0;

    const row = [
      product.name || "",
      product.brand || "",
      product.category?.name || "",
      product.sku || "",
      product.price || 0,
      product.salePrice || "",
      totalStock,
      product.status || "",
      new Date(product.createdAt).toLocaleDateString(),
    ];

    const escapedRow = row.map((field) => {
      const str = String(field);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });

    csv += escapedRow.join(",") + "\n";
  });

  return csv;
};

// Helper function to generate customers report data
const generateCustomersReportData = async (params) => {
  const { days = 30 } = params;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  const users = await User.find({
    role: "user",
    createdAt: { $gte: startDate },
  }).sort({ createdAt: -1 });

  return users;
};

// Helper function to convert customers data to CSV
const convertCustomersDataToCSV = (users) => {
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Registration Date",
    "Status",
    "Email Verified",
  ];

  let csv = headers.join(",") + "\n";

  users.forEach((user) => {
    const row = [
      `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      user.email || "",
      user.phone || "",
      new Date(user.createdAt).toLocaleDateString(),
      user.status || "active",
      user.emailVerified ? "Yes" : "No",
    ];

    const escapedRow = row.map((field) => {
      const str = String(field);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });

    csv += escapedRow.join(",") + "\n";
  });

  return csv;
};

exports.exportReport = exportReport;
