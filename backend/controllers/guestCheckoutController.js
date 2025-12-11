// controllers/guestCheckoutController.js
const User = require("../models/User");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const asyncHandler = require("../utils/asyncHandler");
const crypto = require("crypto");
const emailService = require("../utils/emailService");
const { auditLogger } = require("../utils/auditLogger");

// @desc    Initialize guest session
// @route   POST /api/guest/init
// @access  Public
const initGuestSession = asyncHandler(async (req, res) => {
  // Generate unique guest ID
  const guestId = `guest_${crypto.randomBytes(16).toString("hex")}`;

  // Set session expiry (30 days)
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30);

  // Create temporary guest user
  const guestUser = await User.create({
    firstName: "Guest",
    lastName: "User",
    email: `${guestId}@guest.lilyth.in`,
    isGuest: true,
    guestId: guestId,
    guestSessionExpiry: expiryDate,
    isActive: true,
    role: "customer",
  });

  // Create empty cart for guest
  await Cart.create({
    user: guestUser._id,
    guestId: guestId,
    isGuestCart: true,
    items: [],
  });

  // Log guest session creation
  await auditLogger.log({
    userId: guestUser._id,
    action: "GUEST_SESSION_CREATED",
    resource: "user",
    details: { guestId },
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.status(201).json({
    success: true,
    message: "Guest session created",
    guestId: guestId,
    userId: guestUser._id,
    expiresAt: expiryDate,
  });
});

// @desc    Get guest cart
// @route   GET /api/guest/:guestId/cart
// @access  Public
const getGuestCart = asyncHandler(async (req, res) => {
  const { guestId } = req.params;

  const cart = await Cart.findOne({ guestId, isGuestCart: true }).populate({
    path: "items.product",
    select: "name price salePrice images slug status variants",
  });

  if (!cart) {
    return res.status(404).json({
      success: false,
      message: "Guest cart not found",
    });
  }

  res.status(200).json({
    success: true,
    cart,
  });
});

// @desc    Add item to guest cart
// @route   POST /api/guest/:guestId/cart/add
// @access  Public
const addToGuestCart = asyncHandler(async (req, res) => {
  const { guestId } = req.params;
  const { productId, size, color, quantity = 1 } = req.body;

  // Validate product
  const product = await Product.findById(productId);
  if (!product || product.status !== "active") {
    return res.status(404).json({
      success: false,
      message: "Product not found or unavailable",
    });
  }

  // Check variant and stock
  const variant = product.variants.find(
    (v) => v.size === size && v.color.name === color
  );

  if (!variant) {
    return res.status(400).json({
      success: false,
      message: "Product variant not found",
    });
  }

  if (variant.stock < quantity) {
    return res.status(400).json({
      success: false,
      message: `Only ${variant.stock} items available in stock`,
    });
  }

  // Get guest cart
  let cart = await Cart.findOne({ guestId, isGuestCart: true });

  if (!cart) {
    return res.status(404).json({
      success: false,
      message: "Guest session not found. Please refresh the page.",
    });
  }

  // Check if item exists
  const existingItemIndex = cart.items.findIndex(
    (item) =>
      item.product.toString() === productId &&
      item.variant.size === size &&
      item.variant.color.name === color
  );

  const currentPrice = product.salePrice || product.price;

  if (existingItemIndex > -1) {
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;

    if (newQuantity > variant.stock) {
      return res.status(400).json({
        success: false,
        message: `Cannot add more items. Only ${variant.stock} available in stock`,
      });
    }

    cart.items[existingItemIndex].quantity = newQuantity;
    cart.items[existingItemIndex].priceAtAdd = currentPrice;
  } else {
    cart.items.push({
      product: productId,
      variant: {
        size,
        color: {
          name: color,
          hexCode: variant.color.hexCode,
        },
      },
      quantity,
      priceAtAdd: currentPrice,
    });
  }

  await cart.save();

  // Populate and return
  cart = await Cart.findById(cart._id).populate({
    path: "items.product",
    select: "name price salePrice images slug status variants",
  });

  res.status(200).json({
    success: true,
    message: "Item added to cart",
    cart,
  });
});

// @desc    Guest checkout
// @route   POST /api/guest/:guestId/checkout
// @access  Public
const guestCheckout = asyncHandler(async (req, res) => {
  const { guestId } = req.params;
  const {
    email,
    firstName,
    lastName,
    phone,
    shippingAddress,
    billingAddress,
    paymentMethod,
    items,
    promoCode,
    specialInstructions,
  } = req.body;

  // Validate email
  if (!email || !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Valid email is required for order confirmation",
    });
  }

  // Find or get guest user
  let guestUser = await User.findOne({ guestId, isGuest: true });

  if (!guestUser) {
    // ✅ NEW: Check if email already exists as guest user
    guestUser = await User.findOne({ email, isGuest: true });

    if (guestUser) {
      console.log("✅ Found existing guest user with this email:", email);
      // Update the guestId to current session
      guestUser.guestId = guestId;
    } else {
      return res.status(404).json({
        success: false,
        message: "Guest session not found",
      });
    }
  }

  // Check if guest session expired
  if (guestUser.isGuestSessionExpired()) {
    return res.status(400).json({
      success: false,
      message: "Guest session has expired. Please start a new session.",
    });
  }

  // ✅ FIXED: Update guest user info (handle duplicate email)
  try {
    guestUser.firstName = firstName;
    guestUser.lastName = lastName;
    guestUser.email = email;
    guestUser.phone = phone;
    await guestUser.save();
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate email - another guest user has this email
      console.log("⚠️ Duplicate guest email, finding existing guest user");
      const existingGuest = await User.findOne({ email, isGuest: true });

      if (existingGuest) {
        console.log("✅ Using existing guest user:", existingGuest._id);
        guestUser = existingGuest;
        // Update with current session info
        guestUser.guestId = guestId;
        guestUser.firstName = firstName;
        guestUser.lastName = lastName;
        guestUser.phone = phone;
        await guestUser.save({ validateBeforeSave: false });
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }

  // Validate products and calculate totals
  let orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    const productId = item.product || item.productId;
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

    if (!variant || variant.stock < item.quantity) {
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

  // Calculate shipping, tax, discount
  const shipping = req.body.shipping || 99;
  const tax = Math.round(subtotal * 0.18);
  const discount = req.body.discount || 0;
  const total = subtotal + shipping + tax - discount;

  // Create order
  const order = await Order.create({
    user: guestUser._id,
    isGuestOrder: true,
    guestEmail: email,
    items: orderItems,
    subtotal,
    shipping: {
      cost: shipping,
      method: "standard",
    },
    tax,
    discount: {
      amount: discount,
      code: promoCode || null,
    },
    total,
    shippingAddress,
    billingAddress: billingAddress || shippingAddress,
    payment: {
      method: paymentMethod === "cod" ? "cash_on_delivery" : "razorpay",
      status: paymentMethod === "cod" ? "pending" : "pending",
    },
    paymentMethod: paymentMethod,
    status: paymentMethod === "cod" ? "confirmed" : "pending",
    specialInstructions,
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
        },
      }
    );
  }

  // Clear guest cart
  await Cart.findOneAndUpdate(
    { guestId, isGuestCart: true },
    { $set: { items: [] } }
  );

  // Send order confirmation email
  try {
    await emailService.sendGuestOrderConfirmation(order, {
      firstName,
      lastName,
      email,
    });
  } catch (emailError) {
    console.error("Failed to send guest order confirmation:", emailError);
  }

  // Log order creation
  await auditLogger.log({
    userId: guestUser._id,
    action: "GUEST_ORDER_CREATED",
    resource: "order",
    resourceId: order._id,
    details: {
      orderNumber: order.orderNumber,
      total: order.total,
      email: email,
      paymentMethod,
    },
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.status(201).json({
    success: true,
    message: "Order placed successfully",
    order: {
      _id: order._id,
      orderNumber: order.orderNumber,
      total: order.total,
      status: order.status,
      trackingToken: order.trackingToken,
      trackingUrl: `${process.env.CLIENT_URL}/track-order/${order.trackingToken}`,
    },
  });
});

// @desc    Track order by email and order number (WORKS FOR ALL USERS)
// @route   POST /api/guest/track-by-email
// @access  Public
const trackOrderByEmail = asyncHandler(async (req, res) => {
  const { email, orderNumber } = req.body;

  if (!email || !orderNumber) {
    return res.status(400).json({
      success: false,
      message: "Email and order number are required",
    });
  }

  try {
    const emailLower = email.toLowerCase().trim();
    const orderNumUpper = orderNumber.trim().toUpperCase();

    // First, try to find as a guest order
    let order = await Order.findOne({
      guestEmail: emailLower,
      orderNumber: orderNumUpper,
      isGuestOrder: true,
    }).populate({
      path: "items.product",
      select: "name images slug",
    });

    // If not found as guest order, try to find as registered user order
    if (!order) {
      // Find user by email
      const user = await User.findOne({
        email: emailLower,
        isGuest: false,
      });

      if (user) {
        // Find order for this user
        order = await Order.findOne({
          user: user._id,
          orderNumber: orderNumUpper,
          isGuestOrder: false,
        }).populate({
          path: "items.product",
          select: "name images slug",
        });
      }
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found. Please check your email and order number.",
      });
    }

    // For guest orders, return tracking token
    if (order.isGuestOrder && order.trackingToken) {
      return res.status(200).json({
        success: true,
        trackingToken: order.trackingToken,
        isGuestOrder: true,
        message: "Order found successfully",
      });
    }

    // For registered user orders, return order ID for navigation
    res.status(200).json({
      success: true,
      orderId: order._id,
      orderNumber: order.orderNumber,
      isGuestOrder: false,
      message: "Order found successfully. Please login to view full details.",
    });
  } catch (error) {
    console.error("Error tracking order by email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to find order. Please try again.",
    });
  }
});

// @desc    Track guest order
// @route   GET /api/guest/track/:trackingToken
// @access  Public
const trackGuestOrder = asyncHandler(async (req, res) => {
  const { trackingToken } = req.params;

  const order = await Order.findOne({
    trackingToken,
    isGuestOrder: true,
  })
    .populate("items.product", "name images")
    .select("-__v");

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  res.status(200).json({
    success: true,
    order,
  });
});

// @desc    Update guest cart item quantity
// @route   PUT /api/guest/:guestId/cart/update
// @access  Public
exports.updateGuestCartItem = asyncHandler(async (req, res) => {
  const { guestId } = req.params;
  const { productId, size, color, quantity } = req.body;

  const cart = await Cart.findOne({ guestId, isGuestCart: true });
  if (!cart) {
    return res
      .status(404)
      .json({ success: false, message: "Guest cart not found" });
  }

  const item = cart.items.find(
    (i) =>
      i.product.toString() === productId &&
      i.variant.size === size &&
      i.variant.color.name === color
  );

  if (!item) {
    return res
      .status(404)
      .json({ success: false, message: "Item not found in cart" });
  }

  item.quantity = quantity;
  await cart.save();

  const updated = await Cart.findById(cart._id).populate("items.product");
  res.json({ success: true, cart: updated });
});

// @desc    Remove item from guest cart
// @route   POST /api/guest/:guestId/cart/remove
// @access  Public
exports.removeGuestCartItem = asyncHandler(async (req, res) => {
  const { guestId } = req.params;
  const { productId, size, color } = req.body;

  const cart = await Cart.findOne({ guestId, isGuestCart: true });
  if (!cart) {
    return res
      .status(404)
      .json({ success: false, message: "Guest cart not found" });
  }

  cart.items = cart.items.filter(
    (i) =>
      !(
        i.product.toString() === productId &&
        i.variant.size === size &&
        i.variant.color.name === color
      )
  );

  await cart.save();

  const updated = await Cart.findById(cart._id).populate("items.product");
  res.json({ success: true, cart: updated });
});

// @desc    Clear guest cart from database
// @route   DELETE /api/guest/:guestId/cart/clear
// @access  Public
const clearGuestCartDB = asyncHandler(async (req, res) => {
  const { guestId } = req.params;

  await Cart.findOneAndUpdate(
    { guestId, isGuestCart: true },
    { $set: { items: [] } }
  );

  return res.status(200).json({
    success: true,
    message: "Guest cart cleared",
  });
});

// @desc    Convert guest to registered user
// @route   POST /api/guest/:guestId/convert
// @access  Public
const convertGuestToRegistered = asyncHandler(async (req, res) => {
  const { guestId } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters",
    });
  }

  const guestUser = await User.findOne({ guestId, isGuest: true });

  if (!guestUser) {
    return res.status(404).json({
      success: false,
      message: "Guest session not found",
    });
  }

  // Check if email already exists for registered user
  const existingUser = await User.findOne({
    email: guestUser.email,
    isGuest: false,
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message:
        "An account with this email already exists. Please login instead.",
    });
  }

  // Convert guest to registered user
  await guestUser.convertToRegistered(password);

  // Update cart
  await Cart.updateOne(
    { guestId },
    {
      $set: { isGuestCart: false },
      $unset: { guestId: 1 },
    }
  );

  // Generate JWT token
  const generateToken = require("../utils/generateToken");
  const token = generateToken(guestUser._id);

  // Log conversion
  await auditLogger.log({
    userId: guestUser._id,
    action: "GUEST_CONVERTED_TO_REGISTERED",
    resource: "user",
    resourceId: guestUser._id,
    details: { email: guestUser.email },
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.status(200).json({
    success: true,
    message: "Account created successfully",
    token,
    user: guestUser.getPublicProfile(),
  });
});

// ✅ CORRECT: Export all functions
module.exports = {
  initGuestSession,
  getGuestCart,
  addToGuestCart,
  clearGuestCartDB,
  // ⭐ CORRECT EXPORT NAMES
  updateGuestCartItem: exports.updateGuestCartItem,
  removeGuestCartItem: exports.removeGuestCartItem,

  guestCheckout,
  trackGuestOrder,
  trackOrderByEmail,
  convertGuestToRegistered,
};
