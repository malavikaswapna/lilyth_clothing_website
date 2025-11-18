// controllers/promoCodeController.js
const PromoCode = require("../models/PromoCode");
const Order = require("../models/Order");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { auditLogger } = require("../utils/auditLogger");

// @desc    Validate and apply promo code
// @route   POST /api/promo-codes/validate
// @access  Private
exports.validatePromoCode = asyncHandler(async (req, res) => {
  const { code, orderAmount, items } = req.body;

  if (!code) {
    return res.status(400).json({
      success: false,
      message: "Promo code is required",
    });
  }

  if (!orderAmount || orderAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Valid order amount is required",
    });
  }

  // Find promo code (case-insensitive)
  const promoCode = await PromoCode.findOne({
    code: code.toUpperCase(),
  });

  if (!promoCode) {
    return res.status(404).json({
      success: false,
      message: "Invalid promo code",
    });
  }

  // Check if promo code is active
  if (!promoCode.isActive) {
    return res.status(400).json({
      success: false,
      message: "This promo code is no longer active",
    });
  }

  // Check validity period
  const now = new Date();
  if (now < promoCode.startDate) {
    return res.status(400).json({
      success: false,
      message: "This promo code is not yet active",
    });
  }

  if (now > promoCode.endDate) {
    return res.status(400).json({
      success: false,
      message: "This promo code has expired",
    });
  }

  // Check usage limits
  if (
    promoCode.maxUsageCount !== null &&
    promoCode.currentUsageCount >= promoCode.maxUsageCount
  ) {
    return res.status(400).json({
      success: false,
      message: "This promo code has reached its usage limit",
    });
  }

  // Check if user can use this code
  if (!promoCode.canUserUse(req.user._id)) {
    return res.status(400).json({
      success: false,
      message: "You have already used this promo code maximum allowed times",
    });
  }

  // Check minimum order amount
  if (orderAmount < promoCode.minOrderAmount) {
    return res.status(400).json({
      success: false,
      message: `Minimum order amount of ₹${promoCode.minOrderAmount} required to use this code`,
      minOrderAmount: promoCode.minOrderAmount,
    });
  }

  // Check first order only restriction
  if (promoCode.firstOrderOnly) {
    const userOrderCount = await Order.countDocuments({
      user: req.user._id,
      status: { $ne: "cancelled" },
    });

    if (userOrderCount > 0) {
      return res.status(400).json({
        success: false,
        message: "This promo code is only valid for first orders",
      });
    }
  }

  // Check product/category applicability
  if (!promoCode.isApplicableToAll && items) {
    const applicableProductIds = promoCode.applicableProducts.map((id) =>
      id.toString()
    );
    const applicableCategoryIds = promoCode.applicableCategories.map((id) =>
      id.toString()
    );

    const hasApplicableItem = items.some((item) => {
      return (
        applicableProductIds.includes(item.productId) ||
        applicableCategoryIds.includes(item.categoryId)
      );
    });

    if (!hasApplicableItem) {
      return res.status(400).json({
        success: false,
        message: "This promo code is not applicable to items in your cart",
      });
    }
  }

  // Calculate discount
  const discountAmount = promoCode.calculateDiscount(orderAmount);
  const finalAmount = Math.max(0, orderAmount - discountAmount);

  // Log validation
  await auditLogger.log({
    userId: req.user._id,
    userName: `${req.user.firstName} ${req.user.lastName}`,
    userEmail: req.user.email,
    action: "PROMO_CODE_VALIDATED",
    resource: "promo_code",
    resourceId: promoCode._id,
    details: {
      code: promoCode.code,
      orderAmount,
      discountAmount,
    },
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.status(200).json({
    success: true,
    message: "Promo code applied successfully!",
    promoCode: {
      code: promoCode.code,
      description: promoCode.description,
      discountType: promoCode.discountType,
      discountValue: promoCode.discountValue,
    },
    discount: {
      amount: discountAmount,
      type: promoCode.discountType,
    },
    orderSummary: {
      subtotal: orderAmount,
      discount: discountAmount,
      total: finalAmount,
    },
  });
});

// @desc    Get all promo codes (Admin)
// @route   GET /api/admin/promo-codes
// @access  Private/Admin
exports.getAllPromoCodes = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;

  // Build query
  let query = {};

  // Filter by status
  if (req.query.status === "active") {
    query.isActive = true;
  } else if (req.query.status === "inactive") {
    query.isActive = false;
  }

  // Filter by validity
  if (req.query.validity === "valid") {
    const now = new Date();
    query.isActive = true;
    query.startDate = { $lte: now };
    query.endDate = { $gte: now };
  } else if (req.query.validity === "expired") {
    query.endDate = { $lt: new Date() };
  }

  // Search by code
  if (req.query.search) {
    query.code = { $regex: req.query.search, $options: "i" };
  }

  const promoCodes = await PromoCode.find(query)
    .populate("createdBy", "firstName lastName email")
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  const total = await PromoCode.countDocuments(query);

  res.status(200).json({
    success: true,
    count: promoCodes.length,
    total,
    pagination: {
      page,
      pages: Math.ceil(total / limit),
      limit,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
    promoCodes,
  });
});

// @desc    Get single promo code (Admin)
// @route   GET /api/admin/promo-codes/:id
// @access  Private/Admin
exports.getPromoCode = asyncHandler(async (req, res) => {
  const promoCode = await PromoCode.findById(req.params.id)
    .populate("createdBy", "firstName lastName email")
    .populate("applicableProducts", "name images")
    .populate("applicableCategories", "name")
    .populate("usedBy.user", "firstName lastName email");

  if (!promoCode) {
    return res.status(404).json({
      success: false,
      message: "Promo code not found",
    });
  }

  res.status(200).json({
    success: true,
    promoCode,
  });
});

// @desc    Create promo code (Admin)
// @route   POST /api/admin/promo-codes
// @access  Private/Admin
exports.createPromoCode = asyncHandler(async (req, res) => {
  const {
    code,
    description,
    discountType,
    discountValue,
    maxUsageCount,
    maxUsagePerUser,
    minOrderAmount,
    maxDiscountAmount,
    startDate,
    endDate,
    applicableProducts,
    applicableCategories,
    isApplicableToAll,
    firstOrderOnly,
  } = req.body;

  // Validate required fields
  if (
    !code ||
    !description ||
    !discountType ||
    !discountValue ||
    !startDate ||
    !endDate
  ) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields",
    });
  }

  // Check if code already exists
  const existingCode = await PromoCode.findOne({
    code: code.toUpperCase(),
  });

  if (existingCode) {
    return res.status(400).json({
      success: false,
      message: "This promo code already exists",
    });
  }

  // Validate discount value
  if (
    discountType === "percentage" &&
    (discountValue < 0 || discountValue > 100)
  ) {
    return res.status(400).json({
      success: false,
      message: "Percentage discount must be between 0 and 100",
    });
  }

  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end.getTime() <= start.getTime()) {
    return res.status(400).json({
      success: false,
      message: "End date must be after start date",
    });
  }

  // Create promo code
  const promoCode = await PromoCode.create({
    code: code.toUpperCase(),
    description, //
    discountType,
    discountValue,
    maxUsageCount: maxUsageCount || null,
    maxUsagePerUser: maxUsagePerUser || 1,
    minOrderAmount: minOrderAmount || 0,
    maxDiscountAmount: maxDiscountAmount || null,
    startDate: start,
    endDate: end,
    applicableProducts: applicableProducts || [],
    applicableCategories: applicableCategories || [],
    isApplicableToAll: isApplicableToAll !== false,
    firstOrderOnly: firstOrderOnly || false,
    createdBy: req.user._id,
  });

  // Log creation
  try {
    await auditLogger.log({
      userId: req.user._id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userEmail: req.user.email,
      action: "PROMO_CODE_CREATED",
      resource: "promo_code",
      resourceId: promoCode._id,
      details: { code: promoCode.code },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  } catch (auditError) {
    console.error("Audit log error:", auditError);
    // Don't fail the creation if audit logging fails
  }

  res.status(201).json({
    success: true,
    message: "Promo code created successfully",
    promoCode,
  });
});

// @desc    Update promo code (Admin)
// @route   PUT /api/admin/promo-codes/:id
// @access  Private/Admin
exports.updatePromoCode = asyncHandler(async (req, res) => {
  let promoCode = await PromoCode.findById(req.params.id);

  if (!promoCode) {
    return res.status(404).json({
      success: false,
      message: "Promo code not found",
    });
  }

  // Don't allow changing code if already used
  if (
    req.body.code &&
    req.body.code !== promoCode.code &&
    promoCode.currentUsageCount > 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Cannot change code for already used promo codes",
    });
  }

  //Validate dates BEFORE updating
  let startDateToCheck = req.body.startDate
    ? new Date(req.body.startDate)
    : promoCode.startDate;
  let endDateToCheck = req.body.endDate
    ? new Date(req.body.endDate)
    : promoCode.endDate;

  console.log("Date validation check:");
  console.log("  Start date:", startDateToCheck);
  console.log("  End date:", endDateToCheck);
  console.log("  Start timestamp:", startDateToCheck.getTime());
  console.log("  End timestamp:", endDateToCheck.getTime());

  if (endDateToCheck.getTime() <= startDateToCheck.getTime()) {
    return res.status(400).json({
      success: false,
      message: "End date must be after start date",
    });
  }

  const oldData = { ...promoCode.toObject() };

  // Update fields manually to avoid validation issues
  Object.keys(req.body).forEach((key) => {
    if (key === "startDate" || key === "endDate") {
      promoCode[key] = new Date(req.body[key]);
    } else {
      promoCode[key] = req.body[key];
    }
  });

  // Save the document (this will run validators on the instance)
  await promoCode.save({ validateBeforeSave: false }); // Skip validation since we already validated

  // Log update
  try {
    await auditLogger.log({
      userId: req.user._id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userEmail: req.user.email,
      action: "PROMO_CODE_UPDATED",
      resource: "promo_code",
      resourceId: promoCode._id,
      details: { code: promoCode.code },
      oldValue: oldData,
      newValue: promoCode.toObject(),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  } catch (auditError) {
    console.error("Audit log error:", auditError);
    // Don't fail the update if audit logging fails
  }

  // Re-fetch to get populated data
  promoCode = await PromoCode.findById(promoCode._id)
    .populate("createdBy", "firstName lastName email")
    .populate("applicableProducts", "name images")
    .populate("applicableCategories", "name");

  res.status(200).json({
    success: true,
    message: "Promo code updated successfully",
    promoCode,
  });
});

// @desc    Toggle promo code status (Admin)
// @route   PUT /api/admin/promo-codes/:id/toggle
// @access  Private/Admin
exports.togglePromoCodeStatus = asyncHandler(async (req, res) => {
  const promoCode = await PromoCode.findById(req.params.id);

  if (!promoCode) {
    return res.status(404).json({
      success: false,
      message: "Promo code not found",
    });
  }

  promoCode.isActive = !promoCode.isActive;
  await promoCode.save();

  // Log toggle
  await auditLogger.log({
    userId: req.user._id,
    userName: `${req.user.firstName} ${req.user.lastName}`,
    userEmail: req.user.email,
    action: "PROMO_CODE_STATUS_CHANGED",
    resource: "promo_code",
    resourceId: promoCode._id,
    details: {
      code: promoCode.code,
      newStatus: promoCode.isActive ? "active" : "inactive",
    },
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.status(200).json({
    success: true,
    message: `Promo code ${
      promoCode.isActive ? "activated" : "deactivated"
    } successfully`,
    promoCode,
  });
});

// @desc    Delete promo code (Admin)
// @route   DELETE /api/admin/promo-codes/:id
// @access  Private/Admin
exports.deletePromoCode = asyncHandler(async (req, res) => {
  const promoCode = await PromoCode.findById(req.params.id);

  if (!promoCode) {
    return res.status(404).json({
      success: false,
      message: "Promo code not found",
    });
  }

  // Don't allow deletion if already used
  if (promoCode.currentUsageCount > 0) {
    return res.status(400).json({
      success: false,
      message:
        "Cannot delete promo code that has been used. Deactivate it instead.",
    });
  }

  await promoCode.deleteOne();

  // Log deletion
  await auditLogger.log({
    userId: req.user._id,
    userName: `${req.user.firstName} ${req.user.lastName}`,
    userEmail: req.user.email,
    action: "PROMO_CODE_DELETED",
    resource: "promo_code",
    resourceId: promoCode._id,
    details: { code: promoCode.code },
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.status(200).json({
    success: true,
    message: "Promo code deleted successfully",
  });
});

// @desc    Get promo code statistics (Admin)
// @route   GET /api/admin/promo-codes/stats
// @access  Private/Admin
exports.getPromoCodeStats = asyncHandler(async (req, res) => {
  const now = new Date();

  const totalCodes = await PromoCode.countDocuments();
  const activeCodes = await PromoCode.countDocuments({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  });
  const expiredCodes = await PromoCode.countDocuments({
    endDate: { $lt: now },
  });

  // Usage statistics
  const usageStats = await PromoCode.aggregate([
    {
      $group: {
        _id: null,
        totalUsage: { $sum: "$currentUsageCount" },
        totalDiscount: { $sum: { $sum: "$usedBy.discountAmount" } },
      },
    },
  ]);

  // Top performing codes
  const topCodes = await PromoCode.find()
    .sort({ currentUsageCount: -1 })
    .limit(5)
    .select("code description currentUsageCount");

  res.status(200).json({
    success: true,
    stats: {
      totalCodes,
      activeCodes,
      expiredCodes,
      totalUsage: usageStats[0]?.totalUsage || 0,
      totalDiscountGiven: usageStats[0]?.totalDiscount || 0,
      topPerformingCodes: topCodes,
    },
  });
});
