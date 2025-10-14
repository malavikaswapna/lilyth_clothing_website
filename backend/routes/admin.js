// routes/admin.js
const express = require("express");
const {
  getDashboard,
  getAllUsers,
  getUserDetails,
  updateUserStatus,
  getInventoryReport,
  getSalesReport,
  getCustomersReport,
  updateProductStock,
  getAdminProducts,
  bulkUpdateProducts,
  bulkDeleteProducts,
  updateProductStatus,
  duplicateProduct,
  exportProducts,
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
  getOrderStats,
  exportOrders,
  exportReport,
  getAuditLogs,
  getInventoryAlerts,
  getStockPrediction,
  getReviewStats,
} = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/auth");
const {
  getAllReviews,
  moderateReview,
} = require("../controllers/reviewController");
const { getContactStats } = require("../controllers/contactController");
const { getDefaultHighWaterMark } = require("nodemailer/lib/xoauth2");
const { MongoServerSelectionError } = require("mongodb");

const router = express.Router();

// All admin routes need auth and admin role
router.use(protect);
router.use(authorize("admin"));

// Dashboard
router.get("/dashboard", getDashboard);
router.get("/reviews/stats", getReviewStats);

// User Management
router.get("/users", getAllUsers);
router.get("/users/:id", getUserDetails);
router.put("/users/:id/status", updateUserStatus);

// Reports - imp(specific routes come before parameterized routes)
router.get("/reports/sales", getSalesReport);
router.get("/reports/inventory", getInventoryReport);
router.get("/reports/customers", getCustomersReport);

// Export routes - imp(specific exports first, then parameterized route)
router.get("/reports/sales/export", (req, res) => {
  req.params.reportType = "sales";
  return exportReport(req, res);
});

router.get("/reports/inventory/export", (req, res) => {
  req.params.reportType = "inventory";
  return exportReport(req, res);
});

router.get("/reports/customers/export", (req, res) => {
  req.params.reportType = "customers";
  return exportReport(req, res);
});

// Fallback parameterized route (comes last)
router.get("/reports/:reportType/export", exportReport);

// Stock Management
router.put("/products/:id/stock", updateProductStock);

// Orders management
router.get("/orders", getAllOrders);
router.get("/orders/stats", getOrderStats);
router.get("/orders/export", exportOrders);
router.get("/orders/:id", getOrderDetails);
router.put("/orders/:id/status", updateOrderStatus);

// Product management routes
router.get("/products", getAdminProducts);
router.put("/products/bulk-update", bulkUpdateProducts);
router.delete("/products/bulk-delete", bulkDeleteProducts);
router.put("/products/:id/status", updateProductStatus);
router.post("/products/:id/duplicate", duplicateProduct);
router.get("/products/export", exportProducts);

// AUDIT LOGS
router.get("/audit-logs", getAuditLogs);
router.get("/audit-logs/user/:userId", getAuditLogs);

// INVENTORY MONITORING
router.get("/inventory/alerts", getInventoryAlerts);
router.get("/inventory/prediction/:productId", getStockPrediction);

router.get("/contact/stats", getContactStats);

// Review management routes
router.get("/reviews", getAllReviews);
router.get("/reviews/stats", getReviewStats);
router.put("/reviews/:id/moderate", moderateReview);

module.exports = router;
