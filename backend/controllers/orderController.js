// controllers/orderController.js
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const User = require("../models/User");
const PromoCode = require("../models/PromoCode"); // ✅ ADD THIS
const asyncHandler = require("../utils/asyncHandler");
const razorpay = require("../config/razorpay");
const crypto = require("crypto");
const emailService = require("../utils/emailService");
const inventoryMonitor = require("../utils/inventoryMonitor");
const { auditLogger } = require("../utils/auditLogger");
const pincodeService = require("../utils/pincodeService");

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = asyncHandler(async (req, res) => {
  const {
    items,
    shippingAddress,
    billingAddress,
    paymentMethod,
    shippingMethod,
    specialInstructions,
    isGift,
    giftMessage,
    promoCode, // ✅ NEW: Promo code from request
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
      categoryId: product.category, // ✅ ADD THIS for promo code applicability check
    });

    subtotal += totalPrice;
    stockUpdates.push({ product, variant, quantity: item.quantity });
  }

  // Calculate shipping cost
  const shippingCost =
    req.body.shipping || calculateShippingCost(shippingMethod, subtotal);

  // Calculate tax (18% GST for India)
  const tax = req.body.tax || subtotal * 0.18;

  // ✅ NEW: Apply promo code if provided
  let discountAmount = 0;
  let promoCodeDoc = null;
  let promoCodeError = null;

  if (promoCode && promoCode.trim()) {
    try {
      promoCodeDoc = await PromoCode.findOne({
        code: promoCode.toUpperCase().trim(),
      });

      if (promoCodeDoc) {
        // Check if promo code is active
        if (!promoCodeDoc.isActive) {
          promoCodeError = "This promo code is no longer active";
        }
        // Check validity period
        else {
          const now = new Date();
          if (now < promoCodeDoc.startDate) {
            promoCodeError = "This promo code is not yet active";
          } else if (now > promoCodeDoc.endDate) {
            promoCodeError = "This promo code has expired";
          }
          // Check usage limits
          else if (
            promoCodeDoc.maxUsageCount !== null &&
            promoCodeDoc.currentUsageCount >= promoCodeDoc.maxUsageCount
          ) {
            promoCodeError = "This promo code has reached its usage limit";
          }
          // Check if user can use this code
          else if (!promoCodeDoc.canUserUse(req.user._id)) {
            promoCodeError =
              "You have already used this promo code maximum allowed times";
          }
          // Check minimum order amount
          else if (subtotal < promoCodeDoc.minOrderAmount) {
            promoCodeError = `Minimum order amount of ₹${promoCodeDoc.minOrderAmount} required to use this code`;
          }
          // Check first order only restriction
          else {
            if (promoCodeDoc.firstOrderOnly) {
              const userOrderCount = await Order.countDocuments({
                user: req.user._id,
                status: { $ne: "cancelled" },
              });

              if (userOrderCount > 0) {
                promoCodeError =
                  "This promo code is only valid for first orders";
              }
            }

            // Check product/category applicability
            if (
              !promoCodeError &&
              !promoCodeDoc.isApplicableToAll &&
              orderItems.length > 0
            ) {
              const applicableProductIds = promoCodeDoc.applicableProducts.map(
                (id) => id.toString()
              );
              const applicableCategoryIds =
                promoCodeDoc.applicableCategories.map((id) => id.toString());

              const hasApplicableItem = orderItems.some((item) => {
                return (
                  applicableProductIds.includes(item.product.toString()) ||
                  applicableCategoryIds.includes(item.categoryId?.toString())
                );
              });

              if (!hasApplicableItem) {
                promoCodeError =
                  "This promo code is not applicable to items in your cart";
              }
            }

            // If all checks pass, calculate and apply discount
            if (!promoCodeError) {
              discountAmount = promoCodeDoc.calculateDiscount(subtotal);

              // Update promo code usage
              promoCodeDoc.currentUsageCount += 1;
              promoCodeDoc.usedBy.push({
                user: req.user._id,
                usedAt: new Date(),
                discountAmount: discountAmount,
              });

              await promoCodeDoc.save();

              // Log promo code application
              await auditLogger.log({
                userId: req.user._id,
                userName: `${req.user.firstName} ${req.user.lastName}`,
                userEmail: req.user.email,
                action: "PROMO_CODE_APPLIED",
                resource: "promo_code",
                resourceId: promoCodeDoc._id,
                details: {
                  code: promoCodeDoc.code,
                  discountAmount: discountAmount,
                  orderSubtotal: subtotal,
                },
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"],
              });
            }
          }
        }
      } else {
        promoCodeError = "Invalid promo code";
      }
    } catch (error) {
      console.error("Promo code error:", error);
      promoCodeError = "Error applying promo code";
    }
  }

  // If there's a promo code error, return it
  if (promoCodeError) {
    return res.status(400).json({
      success: false,
      message: promoCodeError,
    });
  }

  // Calculate total with discount
  const total =
    req.body.total || subtotal + shippingCost + tax - discountAmount;

  // Create order with promo code discount
  const order = await Order.create({
    user: req.user.id,
    items: orderItems,
    subtotal,
    shipping: {
      cost: shippingCost,
      method: shippingMethod || "standard",
    },
    tax,
    discount: {
      // ✅ NEW: Discount object
      amount: discountAmount,
      code: promoCode || null,
      promoCode: promoCodeDoc ? promoCodeDoc._id : null,
      type: promoCodeDoc ? promoCodeDoc.discountType : "none",
    },
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

  // Update product stock and analytics
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
    .populate("items.product", "name slug images")
    .populate(
      "discount.promoCode",
      "code description discountType discountValue"
    ); // ✅ NEW: Populate promo code

  // Send order confirmation email
  try {
    await emailService.sendOrderConfirmation(populatedOrder, req.user);
  } catch (emailError) {
    console.error("Failed to send order confirmation email:", emailError);
  }

  // Log audit trail
  try {
    await auditLogger.logOrderAction("ORDER_CREATED", req.user, order._id, {
      orderNumber: order.orderNumber,
      total: order.total,
      discountAmount: discountAmount,
      promoCode: promoCode || null,
    });
  } catch (auditError) {
    console.error("Failed to log audit trail:", auditError);
  }

  res.status(201).json({
    success: true,
    message: "Order created successfully",
    order: populatedOrder,
    promoCodeApplied:
      discountAmount > 0
        ? {
            code: promoCode,
            discountAmount: discountAmount,
            message: `You saved ₹${discountAmount.toFixed(2)}!`,
          }
        : null,
  });
});

// Helper function to calculate shipping cost
const calculateShippingCost = (method, subtotal) => {
  if (subtotal >= 1000) return 0; // Free shipping over ₹1000

  switch (method) {
    case "standard":
      return 50;
    case "expedited":
      return 100;
    case "overnight":
      return 200;
    case "pickup":
      return 0;
    default:
      return 50;
  }
};

// @desc    Get user's orders
// @route   GET /api/orders
// @access  Private
exports.getMyOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  // Build query
  let query = { user: req.user.id };

  // Filter by status if provided
  if (req.query.status) {
    query.status = req.query.status;
  }

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit)
    .populate("items.product", "name slug images")
    .populate("discount.promoCode", "code description"); // ✅ NEW: Populate promo code

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
});

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "firstName lastName email")
    .populate("items.product", "name slug images brand")
    .populate(
      "discount.promoCode",
      "code description discountType discountValue"
    ); // ✅ NEW

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

  // ✅ NEW: Restore promo code usage if applicable
  if (order.discount && order.discount.promoCode) {
    try {
      const promoCode = await PromoCode.findById(order.discount.promoCode);
      if (promoCode) {
        // Decrease usage count
        promoCode.currentUsageCount = Math.max(
          0,
          promoCode.currentUsageCount - 1
        );

        // Remove from usedBy array
        promoCode.usedBy = promoCode.usedBy.filter(
          (usage) =>
            usage.order && usage.order.toString() !== order._id.toString()
        );

        await promoCode.save();
      }
    } catch (error) {
      console.error("Error restoring promo code usage:", error);
      // Don't fail the cancellation if this fails
    }
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
    .populate("items.product", "name slug")
    .populate("discount.promoCode", "code"); // ✅ NEW

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
        promoCode, // ✅ NEW: Get promo code from order data
      } = orderData;

      // Validate all products and calculate totals
      let orderItems = [];
      let subtotal = 0;

      for (const item of items) {
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
          categoryId: product.category,
        });

        subtotal += totalPrice;
      }

      const shippingCost = calculateShippingCost(shippingMethod, subtotal);
      const tax = subtotal * 0.18;

      // ✅ NEW: Apply promo code
      let discountAmount = 0;
      let promoCodeDoc = null;

      if (promoCode && promoCode.trim()) {
        promoCodeDoc = await PromoCode.findOne({
          code: promoCode.toUpperCase().trim(),
        });

        if (promoCodeDoc && promoCodeDoc.isValid) {
          if (promoCodeDoc.canUserUse(req.user._id)) {
            if (subtotal >= promoCodeDoc.minOrderAmount) {
              discountAmount = promoCodeDoc.calculateDiscount(subtotal);

              // Update promo code usage
              promoCodeDoc.currentUsageCount += 1;
              promoCodeDoc.usedBy.push({
                user: req.user._id,
                usedAt: new Date(),
                discountAmount: discountAmount,
              });

              await promoCodeDoc.save();
            }
          }
        }
      }

      const total = subtotal + shippingCost + tax - discountAmount;

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
        discount: {
          // ✅ NEW
          amount: discountAmount,
          code: promoCode || null,
          promoCode: promoCodeDoc ? promoCodeDoc._id : null,
          type: promoCodeDoc ? promoCodeDoc.discountType : "none",
        },
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

      // Update product stock
      for (const item of orderItems) {
        await Product.findOneAndUpdate(
          {
            _id: item.product,
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
        .populate("items.product", "name slug images")
        .populate("discount.promoCode", "code description");

      // Send notification to admin if enabled
      try {
        const admin = await User.findOne({
          role: "admin",
          "notificationSettings.orderUpdates": true,
        });

        if (admin && admin.email) {
          await emailService.sendEmail({
            to: admin.email,
            subject: `🎉 New Order #${order.orderNumber}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #3b82f6; color: white; padding: 20px; text-align: center;">
            <h1>New Order Received!</h1>
          </div>
          <div style="padding: 20px; background: #f9fafb;">
            <h2>Order #${order.orderNumber}</h2>
            <p><strong>Customer:</strong> ${order.user.firstName} ${
              order.user.lastName
            }</p>
            <p><strong>Email:</strong> ${order.user.email}</p>
            <p><strong>Total:</strong> ₹${order.total.toLocaleString()}</p>
            <p><strong>Items:</strong> ${order.items.length}</p>
            <p><strong>Date:</strong> ${new Date(
              order.createdAt
            ).toLocaleString()}</p>
            <a href="${process.env.CLIENT_URL}/admin/orders" 
               style="display: inline-block; background: #3b82f6; color: white; 
                      padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
              View Orders
            </a>
          </div>
        </div>
      `,
          });
        }
      } catch (emailError) {
        console.error("Failed to send order notification:", emailError);
        // Don't fail the order creation if email fails
      }

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
    return res.status(500).json({ error: "Webhook not configured" });
  }

  const body = JSON.stringify(req.body);

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  if (signature === expectedSignature) {
    const event = req.body;

    if (event.event === "payment.captured") {
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
    console.warn("⚠️ Invalid webhook signature");
    res.status(400).json({ error: "Invalid signature" });
  }
});
