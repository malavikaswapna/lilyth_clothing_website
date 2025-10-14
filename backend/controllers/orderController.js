// controllers/orderController.js
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const razorpay = require("../config/razorpay");
const crypto = require("crypto");
const emailService = require("../utils/emailService");
const inventoryMonitor = require("../utils/inventoryMonitor");
const { auditLogger } = require("../utils/auditLogger");

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = asyncHandler(async (req, res) => {
  console.log("🔍 CREATE ORDER - Request body received:");
  console.log(JSON.stringify(req.body, null, 2));

  console.log("\n📋 Request body structure:");
  console.log("  - items:", req.body.items?.length, "items");
  console.log(
    "  - shippingAddress:",
    req.body.shippingAddress ? "Present" : "Missing"
  );
  console.log(
    "  - billingAddress:",
    req.body.billingAddress ? "Present" : "Missing"
  );
  console.log("  - paymentMethod:", req.body.paymentMethod);
  console.log("  - shippingMethod:", req.body.shippingMethod);

  if (req.body.shippingAddress) {
    console.log("\n📫 Shipping Address Details:");
    console.log("  - firstName:", req.body.shippingAddress.firstName);
    console.log("  - lastName:", req.body.shippingAddress.lastName);
    console.log("  - addressLine1:", req.body.shippingAddress.addressLine1);
    console.log("  - city:", req.body.shippingAddress.city);
    console.log("  - state:", req.body.shippingAddress.state);
    console.log("  - postalCode:", req.body.shippingAddress.postalCode);
    console.log("  - country:", req.body.shippingAddress.country);
  }
  const {
    items,
    shippingAddress,
    billingAddress,
    paymentMethod,
    shippingMethod,
    specialInstructions,
    isGift,
    giftMessage,
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No order items provided",
    });
  }

  // Validate all products and calculate totals
  let orderItems = [];
  let subtotal = 0;
  const stockUpdates = [];

  for (const item of items) {
    // FIXED: Check for both 'product' and 'productId' fields
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

  // Calculate shipping cost
  const shippingCost =
    req.body.shipping || calculateShippingCost(shippingMethod, subtotal);

  // Calculate tax (18% GST for India)
  const tax = req.body.tax || subtotal * 0.18;

  // Calculate total
  const total = req.body.total || subtotal + shippingCost + tax;

  // Create order
  const order = await Order.create({
    user: req.user.id,
    items: orderItems,
    subtotal,
    shipping: {
      cost: shippingCost,
      method: shippingMethod || "standard",
    },
    tax,
    total,
    shippingAddress,
    billingAddress: billingAddress || shippingAddress,
    payment: {
      method: paymentMethod,
      status: paymentMethod === "cod" ? "pending" : "pending",
    },
    specialInstructions,
    isGift: isGift || false,
    giftMessage,
  });

  // Update product stock and analytics - FIXED VERSION
  for (const { product, variant, quantity } of stockUpdates) {
    await Product.findOneAndUpdate(
      {
        _id: product._id, // ✅ FIXED
        "variants.size": variant.size,
        "variants.color.name": variant.color.name,
      },
      {
        $inc: {
          "variants.$.stock": -quantity,
          purchases: quantity,
          revenue: quantity * (product.salePrice || product.price), // ✅ FIXED
        },
      }
    );

    // Check if stock is low after update
    const updatedProduct = await Product.findById(product._id);
    const updatedVariant = updatedProduct.variants.find(
      (v) => v.size === variant.size && v.color.name === variant.color.name
    );

    // Send low stock alert if needed
    if (updatedVariant && updatedVariant.stock <= 5) {
      await emailService.sendLowStockAlert(updatedProduct, updatedVariant);
    }
  }

  // Update user analytics
  await User.findByIdAndUpdate(req.user.id, {
    $inc: {
      totalOrders: 1,
      totalSpent: total,
    },
  });

  // Clear user's cart
  await Cart.findOneAndUpdate({ user: req.user.id }, { $set: { items: [] } });

  // Populate order details
  const populatedOrder = await Order.findById(order._id)
    .populate("user", "firstName lastName email")
    .populate("items.product", "name slug images");

  // Send order confirmation email
  try {
    await emailService.sendOrderConfirmation(populatedOrder, req.user);
  } catch (emailError) {
    console.error("Failed to send order confirmation email:", emailError);
    // Don't fail the order if email fails
  }

  // Log audit trail
  try {
    await auditLogger.logOrderAction("ORDER_CREATED", req.user, order._id, {
      orderNumber: order.orderNumber,
      total: order.total,
    });
  } catch (auditError) {
    console.error("Failed to log audit trail:", auditError);
    // Don't fail the order if audit logging fails
  }

  res.status(201).json({
    success: true,
    message: "Order created successfully",
    order: populatedOrder,
  });
});

// Helper function to calculate shipping cost
const calculateShippingCost = (method, subtotal) => {
  if (subtotal >= 100) return 0; // Free shipping over $100

  switch (method) {
    case "standard":
      return 5.99;
    case "expedited":
      return 12.99;
    case "overnight":
      return 24.99;
    case "pickup":
      return 0;
    default:
      return 5.99;
  }
};

// @desc    Get user's orders
// @route   GET /api/orders
// @access  Private
exports.getMyOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  const orders = await Order.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit)
    .populate("items.product", "name slug images");

  const total = await Order.countDocuments({ user: req.user.id });

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
});

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "firstName lastName email")
    .populate("items.product", "name slug images brand");

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  // Check if user owns this order or is admin
  if (order.user._id.toString() !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Not authorized to view this order",
    });
  }

  res.status(200).json({
    success: true,
    order,
  });
});

// @desc    Update order status (Admin only)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  const order = await Order.findById(req.params.id).populate(
    "user",
    "firstName lastName email"
  );

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  const oldStatus = order.status;

  // Add status to history
  order.statusHistory.push({
    status,
    timestamp: new Date(),
    note,
    updatedBy: req.user.id,
  });

  order.status = status;

  // Update specific timestamps based on status
  switch (status) {
    case "shipped":
      order.tracking.shippedAt = new Date();
      break;
    case "delivered":
      order.tracking.deliveredAt = new Date();
      break;
  }

  await order.save();

  // Send status update email to customer
  await emailService.sendOrderStatusUpdate(order, order.user, status);

  // Log audit trail
  await auditLogger.logOrderAction(
    "ORDER_STATUS_CHANGED",
    req.user,
    order._id,
    { orderNumber: order.orderNumber },
    oldStatus,
    status
  );

  res.status(200).json({
    success: true,
    message: "Order status updated",
    order,
  });
});

// @desc    Update tracking information (Admin only)
// @route   PUT /api/orders/:id/tracking
// @access  Private/Admin
exports.updateTracking = asyncHandler(async (req, res) => {
  const { carrier, trackingNumber, estimatedDelivery } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  order.tracking = {
    ...order.tracking,
    carrier,
    trackingNumber,
    trackingUrl: generateTrackingUrl(carrier, trackingNumber),
    estimatedDelivery: estimatedDelivery
      ? new Date(estimatedDelivery)
      : undefined,
  };

  await order.save();

  res.status(200).json({
    success: true,
    message: "Tracking information updated",
    order,
  });
});

// Helper function to generate tracking URL
const generateTrackingUrl = (carrier, trackingNumber) => {
  const carriers = {
    fedex: `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingNumber}`,
    ups: `https://www.ups.com/track?tracknum=${trackingNumber}`,
    usps: `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${trackingNumber}`,
    dhl: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
  };

  return (
    carriers[carrier.toLowerCase()] ||
    `https://www.google.com/search?q=${trackingNumber}+tracking`
  );
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  // Check if user owns this order
  if (order.user.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to cancel this order",
    });
  }

  // Can only cancel pending or confirmed orders
  if (!["pending", "confirmed"].includes(order.status)) {
    return res.status(400).json({
      success: false,
      message: "Order cannot be cancelled at this stage",
    });
  }

  // Restore product stock
  for (const item of order.items) {
    await Product.findOneAndUpdate(
      {
        _id: item.product,
        "variants.size": item.variant.size,
        "variants.color.name": item.variant.color.name,
      },
      {
        $inc: {
          "variants.$.stock": item.quantity,
        },
      }
    );
  }

  // Update order status
  order.status = "cancelled";
  order.statusHistory.push({
    status: "cancelled",
    timestamp: new Date(),
    note: req.body.reason || "Cancelled by customer",
    updatedBy: req.user.id,
  });

  await order.save();

  res.status(200).json({
    success: true,
    message: "Order cancelled successfully",
    order,
  });
});

// @desc    Get all orders (Admin only)
// @route   GET /api/admin/orders
// @access  Private/Admin
exports.getAllOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;

  // Build query
  let query = Order.find();

  // Filter by status
  if (req.query.status) {
    query = query.where("status").equals(req.query.status);
  }

  // Filter by date range
  if (req.query.startDate || req.query.endDate) {
    const dateFilter = {};
    if (req.query.startDate) dateFilter.$gte = new Date(req.query.startDate);
    if (req.query.endDate) dateFilter.$lte = new Date(req.query.endDate);
    query = query.where("createdAt").equals(dateFilter);
  }

  // Sort by creation date (newest first)
  query = query.sort({ createdAt: -1 });

  // Pagination
  query = query.skip(startIndex).limit(limit);

  // Populate user and product details
  query = query
    .populate("user", "firstName lastName email")
    .populate("items.product", "name slug");

  const orders = await query;
  const total = await Order.countDocuments();

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
});

// @desc    Create Razorpay order
// @route   POST /api/orders/create-payment
// @access  Private
exports.createPaymentOrder = asyncHandler(async (req, res) => {
  const { amount, currency = "INR" } = req.body;

  try {
    const options = {
      amount: amount * 100, // Razorpay expects amount in paisa
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      order,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment order",
    });
  }
});

// @desc    Verify Razorpay payment
// @route   POST /api/orders/verify-payment
// @access  Private
exports.verifyPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderData,
  } = req.body;

  // Verify signature
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    // Payment is verified, now create the order in database
    try {
      const {
        items,
        shippingAddress,
        billingAddress,
        shippingMethod,
        specialInstructions,
        isGift,
        giftMessage,
      } = orderData;

      // Validate all products and calculate totals
      let orderItems = [];
      let subtotal = 0;

      for (const item of items) {
        // FIXED: Check for both 'product' and 'productId' fields
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

        const variant = product.variants.find(
          (v) => v.size === item.size && v.color.name === item.color
        );

        if (!variant) {
          return res.status(400).json({
            success: false,
            message: `Variant not found for product ${product.name}`,
          });
        }

        if (variant.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}`,
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
      }

      const shippingCost = calculateShippingCost(shippingMethod, subtotal);
      const tax = subtotal * 0.18; // 18% GST for India
      const total = subtotal + shippingCost + tax;

      // Create order with payment success
      const order = await Order.create({
        user: req.user.id,
        items: orderItems,
        subtotal,
        shipping: {
          cost: shippingCost,
          method: shippingMethod || "standard",
        },
        tax,
        total,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        payment: {
          method: "razorpay",
          status: "completed",
          transactionId: razorpay_payment_id,
          razorpayOrderId: razorpay_order_id,
          paidAt: new Date(),
        },
        status: "confirmed",
        specialInstructions,
        isGift: isGift || false,
        giftMessage,
      });

      // Update product stock - FIXED VERSION
      for (const item of orderItems) {
        await Product.findOneAndUpdate(
          {
            _id: item.product, // ✅ This is correct - uses the MongoDB ObjectId
            "variants.size": item.variant.size,
            "variants.color.name": item.variant.color.name,
          },
          {
            $inc: {
              "variants.$.stock": -item.quantity,
              purchases: item.quantity,
              revenue: item.totalPrice,
            },
          }
        );
      }

      // Update user analytics
      await User.findByIdAndUpdate(req.user.id, {
        $inc: {
          totalOrders: 1,
          totalSpent: total,
        },
      });

      // Clear user's cart
      await Cart.findOneAndUpdate(
        { user: req.user.id },
        { $set: { items: [] } }
      );

      const populatedOrder = await Order.findById(order._id)
        .populate("user", "firstName lastName email")
        .populate("items.product", "name slug images");

      res.status(201).json({
        success: true,
        message: "Payment verified and order created successfully",
        order: populatedOrder,
      });
    } catch (error) {
      console.error("Order creation error after payment:", error);
      res.status(500).json({
        success: false,
        message: "Payment verified but order creation failed",
        error: error.message,
      });
    }
  } else {
    res.status(400).json({
      success: false,
      message: "Payment verification failed",
    });
  }
});

// @desc    Handle payment failure
// @route   POST /api/orders/payment-failed
// @access  Private
exports.handlePaymentFailure = asyncHandler(async (req, res) => {
  const { razorpay_order_id, error_description } = req.body;

  // Log payment failure
  console.log("Payment failed:", { razorpay_order_id, error_description });

  res.status(200).json({
    success: false,
    message: "Payment failed. Please try again.",
    error: error_description,
  });
});

// @desc    Razorpay webhook
// @route   POST /api/orders/webhook
// @access  Public (but verify signature)
exports.razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];

  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.error("RAZORPAY_WEBHOOK_SECRET not configured");
    return res.status(500).json({ error: "Webhook not configured " });
  }

  const body = JSON.stringify(req.body);

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  if (signature === expectedSignature) {
    const event = req.body;

    if (event.event === "payment.captured") {
      // Update order status
      await Order.findOneAndUpdate(
        { "payment.razorpayOrderId": event.payload.payment.entity.order_id },
        {
          "payment.status": "completed",
          status: "confirmed",
        }
      );
    }

    res.status(200).json({ status: "ok" });
  } else {
    console.warn("Invalid webhook signature");
    res.status(400).json({ error: "Invalid signature" });
  }
});
