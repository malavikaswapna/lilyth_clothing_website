// routes/paymentSettings.js

const express = require("express");
const router = express.Router();
const {
  getPaymentSettings,
  updatePaymentSettings,
  getAvailablePaymentMethods,
} = require("../controllers/paymentSettingsController");
const { protect, authorize } = require("../middleware/auth");

// Public routes (needed for checkout)
router.get("/", getPaymentSettings);
router.get("/available-methods", getAvailablePaymentMethods);

// Admin routes - require authentication + admin role
router.put("/", protect, authorize("admin"), updatePaymentSettings);

module.exports = router;
