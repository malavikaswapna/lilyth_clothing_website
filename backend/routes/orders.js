// routes/orders.js
const express = require("express");
const {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  updateTracking,
  cancelOrder,
  getAllOrders,
  createPaymentOrder,
  verifyPayment,
  handlePaymentFailure,
  razorpayWebhook,
} = require("../controllers/orderController");
const { protect, authorize } = require("../middleware/auth");
const {
  strictValidateKeralaAddress,
} = require("../middleware/addressValidator");

const router = express.Router();

// IMPORTANT: Webhook route MUST be before any middleware that parses body as JSON
// Razorpay sends raw body that needs to be verified
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  razorpayWebhook
);

// Apply protect middleware to all routes below this line
router.use(protect);

// Customer routes
router.post("/", strictValidateKeralaAddress, createOrder);
router.get("/", getMyOrders);
router.get("/:id", getOrder);
router.put("/:id/cancel", cancelOrder);
router.post("/create-payment", createPaymentOrder);
router.post("/verify-payment", strictValidateKeralaAddress, verifyPayment);
router.post("/payment-failed", handlePaymentFailure);

// Admin routes - these also need the protect middleware (applied above)
router.get("/admin/all", authorize("admin"), getAllOrders);
router.put("/:id/status", authorize("admin"), updateOrderStatus);
router.put("/:id/tracking", authorize("admin"), updateTracking);

module.exports = router;
