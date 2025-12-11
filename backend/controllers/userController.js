// controllers/userController.js
const User = require("../models/User");
const Product = require("../models/Product");
const asyncHandler = require("../utils/asyncHandler");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const emailService = require("../utils/emailService");
const { auditLogger } = require("../utils/auditLogger");

// @desc    Add address to user profile
// @route   POST /api/user/addresses
// @access  Private
exports.addAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (user.addresses.length === 0) {
    req.body.isDefault = true;
  }

  if (req.body.isDefault) {
    user.addresses.forEach((address) => {
      address.isDefault = false;
    });
  }

  user.addresses.push(req.body);
  await user.save();

  const response = {
    success: true,
    message: "Address added successfully",
    user: user.getPublicProfile(),
  };

  if (req.addressSuggestions) {
    response.suggestions = {
      message: `Based on PIN code ${req.body.postalCode}, the city should be "${req.addressSuggestions.city}". You entered "${req.addressSuggestions.userProvidedCity}".`,
      suggestedCity: req.addressSuggestions.city,
      suggestedState: req.addressSuggestions.state,
    };
  }

  res.status(201).json(response);
});

// @desc    Update address
// @route   PUT /api/user/addresses/:addressId
// @access  Private
exports.updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const address = user.addresses.id(req.params.addressId);

  if (!address) {
    return res.status(404).json({
      success: false,
      message: "Address not found",
    });
  }

  // if setting as default, remove default from other addresses
  if (req.body.isDefault) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }
  // update address fields
  Object.assign(address, req.body);
  await user.save();

  res.status(200).json({
    success: true,
    message: "Address updated successfully",
    user: user.getPublicProfile(),
  });
});

// @desc    Delete address
// @route   DELETE /api/user/addresses/:addressId
// @access  Private
exports.deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const address = user.addresses.id(req.params.addressId);

  if (!address) {
    return res.status(404).json({
      success: false,
      message: "Address not found",
    });
  }

  const wasDefault = address.isDefault;
  address.deleteOne();

  // if deleted address was default, make first remaining address default
  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: "Address deleted successfully",
    user: user.getPublicProfile(),
  });
});

// @desc    Get user's wishlist
// @route   GET /api/user/wishlist
// @access  Private
exports.getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate({
    path: "wishlist",
    select:
      "name price salePrice images slug brand averageRating reviewCount status",
    match: { status: "active" },
  });

  res.status(200).json({
    success: true,
    count: user.wishlist.length,
    wishlist: user.wishlist,
  });
});

// @desc    Add product to wishlist
// @route   POST /api/user/wishlist/:productId
// @access  Private
exports.addToWishlist = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.productId);

  if (!product || product.status !== "active") {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  const user = await User.findById(req.user.id);

  // check if product already in wishlist
  if (user.wishlist.includes(req.params.productId)) {
    return res.status(400).json({
      success: false,
      message: "Product already in wishlist",
    });
  }

  user.wishlist.push(req.params.productId);
  await user.save();

  res.status(200).json({
    success: true,
    message: "Product added to wishlist",
  });
});

// @desc    Remove product from wishlist
// @route   DELETE /api/user/wishlist/:productId
// @access  Private
exports.removeFromWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  user.wishlist = user.wishlist.filter(
    (productId) => productId.toString() !== req.params.productId
  );

  await user.save();

  res.status(200).json({
    success: true,
    message: "Product removed from wishlist",
  });
});

// @desc    Update preferred sizes
// @route   PUT /api/user/sizes
// @access  Private
exports.updatePreferredSizes = asyncHandler(async (req, res) => {
  const { preferredSizes } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { preferredSizes },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: "Preferred sizes updated",
    user: user.getPublicProfile(),
  });
});

// @desc    Get user addresses
// @route   GET /api/user/addresses
// @access  Private
exports.getAddresses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("addresses");

  res.status(200).json({
    success: true,
    addresses: user.addresses || [],
  });
});

// @desc    Get user analytics/dashboard
// @route   GET /api/user/analytics
// @access  Private
exports.getUserAnalytics = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  // get recent orders (last 5)
  const recentOrders = await Order.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("items.product", "name images");

  // get wishlist count
  const wishlistCount = user.wishlist.length;

  const analytics = {
    totalOrders: user.totalOrders,
    totalSpent: user.totalSpent,
    averageOrderValue:
      user.totalOrders > 0 ? user.totalSpent / user.totalOrders : 0,
    wishlistCount,
    recentOrders: recentOrders.map((order) => ({
      id: order._id,
      orderNumber: order.orderNumber,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
      itemCount: order.items.length,
      firstItem: order.items[0]
        ? {
            name: order.items[0].productName,
            image: order.items[0].productImage,
          }
        : null,
    })),
    memberSince: user.createdAt,
    lastLogin: user.lastLogin,
  };

  res.status(200).json({
    success: true,
    analytics,
  });
});

// @desc    Update notification settings
// @route   PUT /api/user/notifications
// @access  Private
exports.updateNotificationSettings = asyncHandler(async (req, res) => {
  const { notificationSettings } = req.body;

  // validate notification settings structure
  const allowedSettings = [
    "emailNotifications",
    "orderUpdates",
    "newUsers",
    "lowStock",
    "salesReports",
    "systemUpdates",
  ];

  // filter out any invalid keys
  const validSettings = {};
  if (notificationSettings) {
    Object.keys(notificationSettings).forEach((key) => {
      if (allowedSettings.includes(key)) {
        validSettings[key] = Boolean(notificationSettings[key]);
      }
    });
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { notificationSettings: validSettings },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: "Notification settings updated successfully",
    user: user.getPublicProfile(),
  });
});

// @desc    Get notification settings
// @route   GET /api/user/notifications
// @access  Private
exports.getNotificationSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("notificationSettings");

  res.status(200).json({
    success: true,
    notificationSettings: user.notificationSettings || {
      emailNotifications: true,
      orderUpdates: true,
      newUsers: true,
      lowStock: true,
      salesReports: false,
      systemUpdates: true,
    },
  });
});

// @desc    Delete user account
// @route   DELETE /api/user/account
// @access  Private
exports.deleteAccount = asyncHandler(async (req, res) => {
  const { password, confirmText } = req.body;

  // For Google OAuth users, password is not required
  if (req.user.authProvider !== "google") {
    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required to delete your account",
      });
    }

    // Verify password
    const user = await User.findById(req.user.id).select("+password");
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password",
      });
    }
  }

  // Verify confirmation text
  if (confirmText !== "DELETE MY ACCOUNT") {
    return res.status(400).json({
      success: false,
      message: "Please type 'DELETE MY ACCOUNT' to confirm",
    });
  }

  try {
    // Get user details before deletion for logging
    const userEmail = req.user.email;
    const userName = `${req.user.firstName} ${req.user.lastName}`;
    const userId = req.user.id;

    // Check for pending/active orders
    const activeOrders = await Order.find({
      user: req.user.id,
      status: { $in: ["pending", "confirmed", "processing", "shipped"] },
    });

    if (activeOrders.length > 0) {
      return res.status(400).json({
        success: false,
        message: `You have ${activeOrders.length} active order(s). Please wait until they are delivered or cancel them before deleting your account.`,
        activeOrders: activeOrders.map((order) => ({
          orderNumber: order.orderNumber,
          status: order.status,
          total: order.total,
        })),
      });
    }

    // Anonymize user data instead of hard delete (GDPR compliant approach)
    // This preserves order history while removing personal information
    const anonymizedEmail = `deleted_${Date.now()}@deleted.com`;

    // Anonymized address object for orders
    const anonymizedAddress = {
      firstName: "Deleted",
      lastName: "User",
      company: null,
      addressLine1: "[Address Removed]",
      addressLine2: null,
      city: "Kerala",
      state: "Kerala",
      postalCode: "000000",
      country: "India",
    };

    // Anonymize addresses in all user's orders (GDPR compliance)
    await Order.updateMany(
      { user: req.user.id },
      {
        $set: {
          shippingAddress: anonymizedAddress,
          billingAddress: anonymizedAddress,
        },
      }
    );

    await User.findByIdAndUpdate(req.user.id, {
      firstName: "Deleted",
      lastName: "User",
      email: anonymizedEmail,
      phone: null,
      dateOfBirth: null,
      avatar: null,
      addresses: [],
      wishlist: [],
      preferredSizes: [],
      isActive: false,
      emailVerificationToken: null,
      passwordResetToken: null,
      password: null, // Remove password
      firebaseUid: null,
      notificationSettings: {
        emailNotifications: false,
        orderUpdates: false,
        newUsers: false,
        lowStock: false,
        salesReports: false,
        systemUpdates: false,
      },
      notes: [
        ...req.user.notes,
        {
          content: "Account deleted by user",
          addedBy: req.user.id,
          addedAt: new Date(),
        },
      ],
    });

    // Clear cart
    await Cart.findOneAndDelete({ user: req.user.id });

    // Log account deletion
    await auditLogger.log({
      userId: userId,
      userName: userName,
      userEmail: userEmail,
      action: "ACCOUNT_DELETED",
      resource: "user",
      resourceId: userId,
      details: {
        method: req.user.authProvider,
        activeOrdersCount: 0,
        addressesAnonymized: true,
        ordersAnonymized: true,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Send account deletion confirmation email
    try {
      await emailService.sendEmail({
        to: userEmail, // Send to original email before anonymization
        subject: "Account Deleted - LILYTH",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f4f2eb; color: #b87049; padding: 20px; text-align: center;">
              <h1>Account Deleted</h1>
            </div>
            <div style="padding: 20px;">
              <p>Hello ${userName},</p>
              <p>Your LILYTH account has been successfully deleted as per your request.</p>
              <p><strong>What this means:</strong></p>
              <ul>
                <li>Your personal information has been removed</li>
                <li>Your addresses have been anonymized in order records</li>
                <li>You can no longer log in to this account</li>
                <li>Your order history has been anonymized but preserved for legal compliance</li>
                <li>You will no longer receive emails from us</li>
              </ul>
              <p>If you didn't request this deletion, please contact us immediately at <a href="mailto:support@lilyth.in">support@lilyth.in</a></p>
              <p>We're sorry to see you go! If you change your mind, you're always welcome to create a new account.</p>
              <br>
              <p>Best regards,<br>The LILYTH Team</p>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send account deletion email:", emailError);
      // Don't fail the deletion if email fails
    }

    res.status(200).json({
      success: true,
      message: "Your account has been successfully deleted",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete account. Please try again later.",
    });
  }
});
