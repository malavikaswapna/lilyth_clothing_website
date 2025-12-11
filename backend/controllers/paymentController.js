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

/* ---------------------------------------------------------
   CREATE RAZORPAY ORDER (GUEST + LOGGED-IN)
--------------------------------------------------------- */
exports.createRazorpayOrder = asyncHandler(async (req, res) => {
  const { amount, currency = "INR", receipt, notes = {} } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Valid amount is required",
    });
  }

  // ✅ IMPROVED: Better guest user detection and info extraction
  const isGuest = !req.user;
  const user = req.user || {
    id: "guest",
    firstName: notes.firstName || "Guest",
    lastName: notes.lastName || "User",
    email: notes.email || notes.customerEmail || "guest@example.com",
    phone: notes.phone || "",
  };

  console.log("👤 Creating Razorpay order for:", {
    type: isGuest ? "GUEST" : "AUTHENTICATED",
    userId: user.id || user._id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
  });

  const options = {
    amount: Math.round(amount * 100),
    currency,
    receipt: receipt || `receipt_${Date.now()}_${user.id || user._id}`,
    notes: {
      userId: user.id || user._id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      isGuest: isGuest, // ✅ ADD: Flag for guest orders
      ...notes,
    },
  };

  try {
    const razorpayOrder = await razorpay.orders.create(options);
    console.log("✅ Razorpay order created:", razorpayOrder.id);
    console.log("   Is Guest:", isGuest);
    console.log("   Email:", user.email);
    console.log("   Amount:", razorpayOrder.amount, "paise");

    res.status(200).json({
      success: true,
      order: razorpayOrder,
      key: process.env.RAZORPAY_KEY_ID,
      user: {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        contact: user.phone,
      },
    });
  } catch (error) {
    console.error("❌ Razorpay create error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment order",
      error: error.message,
    });
  }
});

/* ---------------------------------------------------------
   VERIFY PAYMENT (GUEST + LOGGED-IN)
--------------------------------------------------------- */
exports.verifyPayment = asyncHandler(async (req, res) => {
  let order; // <-- MUST be defined here so it exists after try block

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderData,
  } = req.body;

  console.log("🔐 Verifying payment...");
  console.log("🧾 Incoming verify payload:", {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    hasOrderData: !!orderData,
    itemCount: orderData?.items?.length,
  });

  /* ---------------------------------------------------------
     1️⃣ BASIC VALIDATION
  --------------------------------------------------------- */
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: "Missing required payment parameters",
    });
  }

  if (
    !orderData ||
    !Array.isArray(orderData.items) ||
    orderData.items.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Order items missing or invalid",
    });
  }

  /* ---------------------------------------------------------
     2️⃣ SIGNATURE VERIFICATION
  --------------------------------------------------------- */
  console.log("🧪 SIGNATURE VERIFICATION");
  console.log(
    "   RAZORPAY_KEY_SECRET exists:",
    !!process.env.RAZORPAY_KEY_SECRET
  );

  const rawSignature = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(rawSignature)
    .digest("hex");

  console.log("   Expected signature:", expectedSignature);
  console.log("   Received signature:", razorpay_signature);
  console.log("   Match:", expectedSignature === razorpay_signature);

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment signature",
    });
  }

  console.log("🟢 Signature verified → continuing...");

  /* ---------------------------------------------------------
     3️⃣ PROCESS ORDER INSIDE TRY/CATCH
  --------------------------------------------------------- */
  try {
    // Normalize items
    orderData.items = orderData.items.map((item) => ({
      productId: item.productId || item.product || item._id,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
    }));

    let orderItems = [];
    let stockUpdates = [];

    /* ---------------------------------------------------------
       VALIDATE PRODUCTS + BUILD ORDER ITEMS
    --------------------------------------------------------- */
    for (const item of orderData.items) {
      const productId = item.productId;
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${productId} not found`,
        });
      }

      const variant = product.variants.find(
        (v) => v.size === item.size && v.color.name === item.color
      );

      if (!variant || variant.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`,
        });
      }

      const price = product.salePrice || product.price;

      orderItems.push({
        product: product._id,
        productName: product.name,
        productImage:
          product.images.find((i) => i.isPrimary)?.url ||
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
        unitPrice: price,
        totalPrice: price * item.quantity,
      });

      stockUpdates.push({ product, variant, quantity: item.quantity });
    }

    /* ---------------------------------------------------------
       DETERMINE USER TYPE
    --------------------------------------------------------- */
    const isGuest = !req.user;
    let userId = req.user ? req.user._id : null;

    console.log("👤 Order User Type:", {
      isGuest,
      userId,
      hasEmail: !!orderData.email,
    });

    // ✅ FIX: Validate guest email
    if (isGuest && !orderData.email) {
      return res.status(400).json({
        success: false,
        message: "Email is required for guest orders",
      });
    }

    // ✅ NEW: Create guest user if needed
    if (isGuest) {
      console.log("📝 Creating guest user for order...");
      const crypto = require("crypto");
      const guestId = `guest_${crypto.randomBytes(8).toString("hex")}`;

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      try {
        const guestUser = await User.create({
          firstName:
            orderData.firstName ||
            orderData.shippingAddress?.firstName ||
            "Guest",
          lastName:
            orderData.lastName || orderData.shippingAddress?.lastName || "User",
          email: orderData.email,
          isGuest: true,
          guestId: guestId,
          guestSessionExpiry: expiryDate,
          isActive: true,
          role: "customer",
        });

        userId = guestUser._id;
        console.log("✅ Guest user created:", {
          userId,
          email: guestUser.email,
          guestId,
        });
      } catch (error) {
        console.error("❌ Failed to create guest user:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to create guest user",
          error: error.message,
        });
      }
    }

    /* ---------------------------------------------------------
       CREATE ORDER DOCUMENT
    --------------------------------------------------------- */
    order = await Order.create({
      user: userId,
      isGuestOrder: isGuest,
      guestEmail: isGuest ? orderData.email : undefined, // ✅ FIX

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

    console.log("✅ Order created:", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      isGuestOrder: order.isGuestOrder,
      guestEmail: order.guestEmail,
      trackingToken: order.trackingToken,
    });

    /* ---------------------------------------------------------
       UPDATE STOCK
    --------------------------------------------------------- */
    for (const entry of stockUpdates) {
      await Product.findOneAndUpdate(
        {
          _id: entry.product._id,
          "variants.size": entry.variant.size,
          "variants.color.name": entry.variant.color.name,
        },
        {
          $inc: {
            "variants.$.stock": -entry.quantity,
            purchases: entry.quantity,
          },
        }
      );
    }

    /* ---------------------------------------------------------
       CLEAR CART
    --------------------------------------------------------- */
    if (isGuest) {
      console.log("🧹 Clearing guest cart for:", userId);
      await Cart.findOneAndUpdate(
        { user: userId }, // Use guest userId
        { $set: { items: [] } }
      );
    } else {
      await Cart.findOneAndUpdate(
        { user: req.user._id },
        { $set: { items: [] } }
      );
    }

    /* ---------------------------------------------------------
       SEND EMAIL
    --------------------------------------------------------- */
    try {
      if (isGuest) {
        console.log("📧 Sending guest order confirmation to:", orderData.email);
        await emailService.sendGuestOrderConfirmation(order, {
          firstName: orderData.firstName || orderData.shippingAddress.firstName,
          lastName: orderData.lastName || orderData.shippingAddress.lastName,
          email: orderData.email,
        });
      } else {
        console.log("📧 Sending order confirmation to registered user");
        await emailService.sendOrderConfirmation(order, req.user);
      }
      console.log("✅ Email sent successfully");
    } catch (emailError) {
      console.warn("⚠️ Email sending failed:", emailError.message);
    }
  } catch (err) {
    console.error("🔥 BACKEND ORDER CREATION ERROR:", err);
    console.error("   Error details:", {
      message: err.message,
      stack: err.stack,
    });

    return res.status(400).json({
      success: false,
      message: "Order creation failed",
      error: err.message,
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }

  /* ---------------------------------------------------------
     SUCCESS RESPONSE
  --------------------------------------------------------- */
  console.log("🎉 Payment verification complete!");
  return res.status(200).json({
    success: true,
    message: "Order created successfully",
    order: {
      _id: order._id,
      orderNumber: order.orderNumber,
      total: order.total,
      status: order.status,
      isGuestOrder: order.isGuestOrder,
      trackingToken: order.trackingToken,
      items: order.items,
      shippingAddress: order.shippingAddress,
      payment: order.payment,
    },
  });
});

/* ---------------------------------------------------------
   PAYMENT FAILURE
--------------------------------------------------------- */
exports.handlePaymentFailure = asyncHandler(async (req, res) => {
  console.log("❌ Payment failure reported:", req.body);

  res.status(200).json({
    success: false,
    message: "Payment failed",
    error: req.body.error || null,
  });
});

/* ---------------------------------------------------------
   RAZORPAY WEBHOOK
--------------------------------------------------------- */
exports.razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];

  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.error("❌ RAZORPAY_WEBHOOK_SECRET not configured");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (expected !== signature) {
    console.error("❌ Invalid webhook signature");
    return res.status(400).json({ error: "Invalid signature" });
  }

  console.log("📩 Razorpay webhook:", req.body.event);
  res.status(200).json({ status: "ok" });
});

/* ---------------------------------------------------------
   ADMIN – GET PAYMENT DETAILS
--------------------------------------------------------- */
exports.getPaymentDetails = asyncHandler(async (req, res) => {
  try {
    const payment = await razorpay.payments.fetch(req.params.paymentId);
    res.status(200).json({ success: true, payment });
  } catch (error) {
    console.error("❌ Failed to fetch payment:", error);
    res.status(404).json({
      success: false,
      message: "Payment not found",
      error: error.message,
    });
  }
});

/* ---------------------------------------------------------
   ADMIN – REFUND
--------------------------------------------------------- */
exports.refundPayment = asyncHandler(async (req, res) => {
  const { amount, notes } = req.body;

  try {
    const refund = await razorpay.payments.refund(req.params.paymentId, {
      amount: amount ? amount * 100 : undefined,
      notes,
    });

    console.log("✅ Refund processed:", refund.id);

    res.status(200).json({
      success: true,
      message: "Refund successful",
      refund,
    });
  } catch (error) {
    console.error("❌ Refund failed:", error);
    res.status(500).json({
      success: false,
      message: "Refund failed",
      error: error.message,
    });
  }
});
