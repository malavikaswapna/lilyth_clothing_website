// routes/payments.js
const express = require("express");
const {
  createRazorpayOrder,
  verifyPayment,
  handlePaymentFailure,
  razorpayWebhook,
  getPaymentDetails,
  refundPayment,
} = require("../controllers/paymentController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

console.log("🔧 Payment routes file loaded");

// Test route to verify payments endpoint is working
router.get("/test", (req, res) => {
  console.log("✅ Test route hit!");
  res.json({
    success: true,
    message: "Payments route is working!",
    availableEndpoints: [
      "POST /api/payments/create-order",
      "POST /api/payments/verify",
      "POST /api/payments/failure",
      "POST /api/payments/webhook",
      "GET /api/payments/:paymentId (admin)",
      "POST /api/payments/:paymentId/refund (admin)",
    ],
  });
});

// Logging middleware for this router
router.use((req, res, next) => {
  console.log(`🔵 Payment route: ${req.method} ${req.originalUrl}`);
  next();
});

// Customer routes - ORDER MATTERS!
router.post("/create-order", protect, (req, res, next) => {
  console.log("🎯 Hit /create-order route");
  createRazorpayOrder(req, res, next);
});

router.post("/verify", protect, (req, res, next) => {
  console.log("🎯 Hit /verify route");
  console.log("   Request body keys:", Object.keys(req.body));
  verifyPayment(req, res, next);
});

router.post("/failure", protect, (req, res, next) => {
  console.log("🎯 Hit /failure route");
  handlePaymentFailure(req, res, next);
});

// Webhook route (public but verified)
router.post("/webhook", (req, res, next) => {
  console.log("🎯 Hit /webhook route");
  razorpayWebhook(req, res, next);
});

// Admin routes - these use :paymentId param, so they should come last
router.get("/:paymentId", protect, authorize("admin"), (req, res, next) => {
  console.log("🎯 Hit /:paymentId route (GET)");
  getPaymentDetails(req, res, next);
});

router.post(
  "/:paymentId/refund",
  protect,
  authorize("admin"),
  (req, res, next) => {
    console.log("🎯 Hit /:paymentId/refund route");
    refundPayment(req, res, next);
  }
);

console.log("✅ Payment routes configured:");
console.log("   - GET /test");
console.log("   - POST /create-order");
console.log("   - POST /verify");
console.log("   - POST /failure");
console.log("   - POST /webhook");
console.log("   - GET /:paymentId");
console.log("   - POST /:paymentId/refund");

module.exports = router;
