// controllers/userController.js
const User = require("../models/User");
const Product = require("../models/Product");
const asyncHandler = require("../utils/asyncHandler");
const Order = require("../models/Order");

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

  // If setting as default, remove default from other addresses
  if (req.body.isDefault) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  // Update address fields
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

  // If deleted address was default, make first remaining address default
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

  // Check if product already in wishlist
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

  // Get recent orders (last 5)
  const recentOrders = await Order.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("items.product", "name images");

  // Get wishlist count
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
