// controllers/paymentController.js
const razorpay = require("../config/razorpay");
const crypto = require("crypto");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const User = require("../models/User");
const PromoCode = require("../models/PromoCode");
const asyncHandler = require("../utils/asyncHandler");
const emailService = require("../utils/emailService");
const { auditLogger } = require("../utils/auditLogger");

// @desc    Create Razorpay order
// @route   POST /api/payments/create-order
// @access  Private
const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { amount, currency = "INR", receipt, notes } = req.body;

  // Validate amount
  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Valid amount is required",
    });
  }

  try {
    const options = {
      amount: Math.round(amount * 100), // Amount in paise
      currency: currency,
      receipt: receipt || `receipt_${Date.now()}_${req.user.id}`,
      notes: {
        userId: req.user.id,
        userName: `${req.user.firstName} ${req.user.lastName}`,
        userEmail: req.user.email,
        ...notes,
      },
    };

    console.log("Creating Razorpay order with options:", options);

    const razorpayOrder = await razorpay.orders.create(options);

    console.log("âœ… Razorpay order created:", razorpayOrder.id);

    res.status(200).json({
      success: true,
      order: razorpayOrder,
      key: process.env.RAZORPAY_KEY_ID,
      user: {
        name: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email,
        contact: req.user.phone,
      },
    });
  } catch (error) {
    console.error("âŒ Razorpay order creation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment order",
      error: error.message,
    });
  }
});

// @desc    Verify Razorpay payment and create order
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderData,
  } = req.body;

  console.log("ðŸ” Verifying payment...");

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: "Missing required payment verification parameters",
    });
  }

  if (!orderData) {
    return res.status(400).json({
      success: false,
      message: "Order data is required",
    });
  }

  // Verify signature
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  const isAuthentic = expectedSignature === razorpay_signature;

  if (!isAuthentic) {
    console.error("âŒ Invalid payment signature");
    return res.status(400).json({
      success: false,
      message: "Payment verification failed - Invalid signature",
    });
  }

  console.log("âœ… Payment signature verified");

  try {
    // Validate all products and calculate totals
    let orderItems = [];
    let subtotal = 0;
    const stockUpdates = [];

    for (const item of orderData.items) {
      const productId = item.product || item.productId;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Product ID is required for all items",
        });
      }

      const product = await Product.findById(productId);

      if (!product || product.status !== "active") {
        return res.status(404).json({
          success: false,
          message: `Product ${productId} not found or unavailable`,
        });
      }

      // Find variant and check stock
      const variant = product.variants.find(
        (v) => v.size === item.size && v.color.name === item.color
      );

      if (!variant) {
        return res.status(400).json({
          success: false,
          message: `Variant not found for product ${product.name}. Size: ${item.size}, Color: ${item.color}`,
        });
      }

      if (variant.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Only ${variant.stock} available`,
        });
      }

      const unitPrice = product.salePrice || product.price;
      const totalPrice = unitPrice * item.quantity;

      orderItems.push({
        product: product._id,
        productName: product.name,
        productImage:
          product.images.find((img) => img.isPrimary)?.url ||
          product.images[0]?.url,
        variant: {
          size: item.size,
          color: {
            name: item.color,
            hexCode: variant.color.hexCode,
          },
          sku: variant.variantSku,
        },
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      });

      subtotal += totalPrice;
      stockUpdates.push({ product, variant, quantity: item.quantity });
    }

    // Create the order with payment completed
    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      subtotal: orderData.subtotal,
      shipping: {
        cost: orderData.shipping,
        method: "standard",
      },
      tax: orderData.tax,
      discount: {
        amount: orderData.discount || 0,
        code: orderData.promoCode || null,
        type: orderData.discount > 0 ? "fixed" : "none",
      },
      total: orderData.total,
      shippingAddress: orderData.shippingAddress,
      billingAddress: orderData.billingAddress || orderData.shippingAddress,
      payment: {
        method: "razorpay",
        status: "completed",
        transactionId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        paidAt: new Date(),
      },
      status: "confirmed",
      specialInstructions: orderData.specialInstructions,
    });

    // Update product stock
    for (const { product, variant, quantity } of stockUpdates) {
      await Product.findOneAndUpdate(
        {
          _id: product._id,
          "variants.size": variant.size,
          "variants.color.name": variant.color.name,
        },
        {
          $inc: {
            "variants.$.stock": -quantity,
            purchases: quantity,
            revenue: quantity * (product.salePrice || product.price),
          },
        }
      );
    }

    // Clear user's cart
    await Cart.findOneAndUpdate({ user: req.user.id }, { $set: { items: [] } });

    // Send order confirmation email
    try {
      await emailService.sendOrderConfirmation(req.user.email, order);
    } catch (emailError) {
      console.error("Failed to send order confirmation email:", emailError);
    }

    // Log order creation
    await auditLogger.log({
      userId: req.user._id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userEmail: req.user.email,
      action: "ORDER_CREATED",
      resource: "order",
      resourceId: order._id,
      details: {
        orderNumber: order.orderNumber,
        total: order.total,
        paymentMethod: "razorpay",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    console.log("âœ… Order created successfully:", order._id);

    res.status(200).json({
      success: true,
      message: "Payment verified and order created successfully",
      order: await Order.findById(order._id).populate("items.product"),
      razorpay_payment_id,
      razorpay_order_id,
    });
  } catch (error) {
    console.error("âŒ Order creation error:", error);
    res.status(500).json({
      success: false,
      message: "Payment verified but order creation failed",
      error: error.message,
    });
  }
});

// @desc    Handle payment failure
// @route   POST /api/payments/failure
// @access  Private
const handlePaymentFailure = asyncHandler(async (req, res) => {
  const { error, razorpay_order_id, razorpay_payment_id } = req.body;

  console.log("âŒ Payment failed:", {
    error,
    razorpay_order_id,
    razorpay_payment_id,
  });

  res.status(200).json({
    success: false,
    message: "Payment failed. Please try again.",
    error: error,
  });
});

// @desc    Razorpay webhook handler
// @route   POST /api/payments/webhook
// @access  Public (with signature verification)
const razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];

  console.log("ðŸ“¨ Received Razorpay webhook");

  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.error("âš ï¸ RAZORPAY_WEBHOOK_SECRET not configured");
    return res.status(500).json({ error: "Webhook not configured" });
  }

  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  if (signature !== expectedSignature) {
    console.warn("âš ï¸ Invalid webhook signature");
    return res.status(400).json({ error: "Invalid signature" });
  }

  const event = req.body;
  console.log("Webhook event:", event.event);

  try {
    switch (event.event) {
      case "payment.captured":
        console.log("ðŸ’° Payment captured:", event.payload.payment.entity.id);
        break;

      case "payment.failed":
        console.log("âŒ Payment failed:", event.payload.payment.entity.id);
        break;

      case "order.paid":
        console.log("âœ… Order paid:", event.payload.order.entity.id);
        break;

      default:
        console.log(`Unhandled webhook event: ${event.event}`);
    }

    res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("Webhook handling error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// @desc    Get payment details
// @route   GET /api/payments/:paymentId
// @access  Private/Admin
const getPaymentDetails = asyncHandler(async (req, res) => {
  try {
    const payment = await razorpay.payments.fetch(req.params.paymentId);

    res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: "Payment not found",
      error: error.message,
    });
  }
});

// @desc    Refund payment
// @route   POST /api/payments/:paymentId/refund
// @access  Private/Admin
const refundPayment = asyncHandler(async (req, res) => {
  const { amount, notes } = req.body;

  try {
    const refund = await razorpay.payments.refund(req.params.paymentId, {
      amount: amount ? Math.round(amount * 100) : undefined,
      notes: notes,
    });

    res.status(200).json({
      success: true,
      message: "Payment refunded successfully",
      refund,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Refund failed",
      error: error.message,
    });
  }
});

//  EXPORT ALL FUNCTIONS
module.exports = {
  createRazorpayOrder,
  verifyPayment,
  handlePaymentFailure,
  razorpayWebhook,
  getPaymentDetails,
  refundPayment,
};
