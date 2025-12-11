// backend/routes/adminNotificationTest.js
// OPTIONAL: Add these routes to your admin routes for easy testing

const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
  sendNewArrivalsDigest,
  sendBackInStockNotification,
  sendPriceDropNotification,
} = require("../utils/productNotificationService");

// Apply admin authentication to all routes
router.use(protect);
router.use(authorize("admin"));

// ========================================
// TEST ENDPOINTS
// ========================================

/**
 * @route   GET /api/admin/test-notifications/new-arrivals
 * @desc    Manually trigger new arrivals digest
 * @access  Admin only
 */
router.get("/new-arrivals", async (req, res) => {
  try {
    console.log("🧪 Manual trigger: New arrivals digest");
    const result = await sendNewArrivalsDigest();

    res.json({
      success: true,
      message: "New arrivals digest sent",
      details: {
        sent: result.sent,
        failed: result.failed,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Test endpoint error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/admin/test-notifications/back-in-stock/:productId
 * @desc    Manually trigger back in stock notification for a product
 * @access  Admin only
 */
router.get("/back-in-stock/:productId", async (req, res) => {
  try {
    console.log(`🧪 Manual trigger: Back in stock for ${req.params.productId}`);
    const result = await sendBackInStockNotification(req.params.productId);

    res.json({
      success: true,
      message: "Back in stock notification sent",
      details: {
        sent: result.sent,
        failed: result.failed,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Test endpoint error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/admin/test-notifications/price-drop/:productId
 * @desc    Manually trigger price drop notification for a product
 * @access  Admin only
 * @body    { oldPrice: number, newPrice: number }
 */
router.post("/price-drop/:productId", async (req, res) => {
  try {
    const { oldPrice, newPrice } = req.body;

    if (!oldPrice || !newPrice) {
      return res.status(400).json({
        success: false,
        message: "oldPrice and newPrice are required",
      });
    }

    console.log(
      `🧪 Manual trigger: Price drop for ${req.params.productId} (₹${oldPrice} → ₹${newPrice})`
    );

    const result = await sendPriceDropNotification(
      req.params.productId,
      parseFloat(oldPrice),
      parseFloat(newPrice)
    );

    res.json({
      success: true,
      message: "Price drop notification sent",
      details: {
        sent: result.sent,
        failed: result.failed,
        discount: `${(((oldPrice - newPrice) / oldPrice) * 100).toFixed(1)}%`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Test endpoint error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/admin/test-notifications/status
 * @desc    Get notification system status
 * @access  Admin only
 */
router.get("/status", async (req, res) => {
  try {
    const User = require("../models/User");
    const Product = require("../models/Product");

    // Get statistics
    const totalUsers = await User.countDocuments({ isActive: true });
    const usersWithNewArrivals = await User.countDocuments({
      "notificationSettings.newUsers": { $ne: false },
      isActive: true,
    });
    const usersWithBackInStock = await User.countDocuments({
      "notificationSettings.lowStock": { $ne: false },
      isActive: true,
    });
    const usersWithPriceDrops = await User.countDocuments({
      "notificationSettings.salesReports": { $ne: false },
      isActive: true,
    });

    // Get recent products
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newProducts = await Product.countDocuments({
      status: "active",
      createdAt: { $gte: sevenDaysAgo },
    });

    // Get products with wishlist items
    const productsInWishlists = await User.aggregate([
      { $unwind: "$wishlist" },
      { $group: { _id: "$wishlist" } },
      { $count: "total" },
    ]);

    res.json({
      success: true,
      status: {
        systemActive: true,
        lastChecked: new Date().toISOString(),
      },
      users: {
        total: totalUsers,
        newArrivalsEnabled: usersWithNewArrivals,
        backInStockEnabled: usersWithBackInStock,
        priceDropsEnabled: usersWithPriceDrops,
      },
      products: {
        newInLast7Days: newProducts,
        inWishlists: productsInWishlists[0]?.total || 0,
      },
      schedule: {
        newArrivalsDigest: "Every Sunday at 10:00 AM",
        backInStock: "Triggered on product stock update",
        priceDrops: "Triggered on product price update (≥5% discount)",
      },
      emailConfiguration: {
        service: process.env.EMAIL_SERVICE || "Not configured",
        user: process.env.EMAIL_USER || "Not configured",
        configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
      },
    });
  } catch (error) {
    console.error("❌ Status endpoint error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
