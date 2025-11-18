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

// Customer routes
router.post("/create-order", protect, createRazorpayOrder);
router.post("/verify", protect, verifyPayment);
router.post("/failure", protect, handlePaymentFailure);

// Webhook route (public but verified)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  razorpayWebhook
);

// Admin routes
router.get("/:paymentId", protect, authorize("admin"), getPaymentDetails);
router.post("/:paymentId/refund", protect, authorize("admin"), refundPayment);

module.exports = router;
