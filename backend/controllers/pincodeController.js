// controllers/pincodeController.js
const asyncHandler = require("../utils/asyncHandler");
const pincodeService = require("../utils/pincodeService");
const { auditLogger } = require("../utils/auditLogger");

// @desc    Validate a Kerala PIN code
// @route   GET /api/pincode/validate/:pincode
// @access  Public
exports.validatePincode = asyncHandler(async (req, res) => {
  const { pincode } = req.params;

  const result = await pincodeService.validatePincode(pincode);

  // log validation attempt
  await auditLogger.log({
    userId: req.user?._id || null,
    action: "PINCODE_VALIDATED",
    resource: "pincode",
    details: {
      pincode,
      isValid: result.isValid,
      isOutsideServiceArea: result.isOutsideServiceArea || false,
    },
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  if (result.isValid === false) {
    return res.status(400).json({
      success: false,
      message: result.message,
      isOutsideServiceArea: result.isOutsideServiceArea || false,
    });
  }

  res.status(200).json({
    success: true,
    message: result.message,
    data: result.data,
  });
});

// @desc    Search Kerala post offices
// @route   GET /api/pincode/search/:query
// @access  Public
exports.searchPostOffice = asyncHandler(async (req, res) => {
  const { query } = req.params;

  const result = await pincodeService.searchPostOffice(query);

  res.status(200).json({
    success: result.success,
    message: result.message,
    count: result.data.length,
    data: result.data,
  });
});

// @desc    Get Kerala district suggestions
// @route   GET /api/pincode/districts/:query
// @access  Public
exports.getDistrictSuggestions = asyncHandler(async (req, res) => {
  const { query } = req.params;

  const result = await pincodeService.getDistrictSuggestions(query);

  res.status(200).json({
    success: result.success,
    suggestions: result.suggestions,
  });
});

// @desc    Get all Kerala districts
// @route   GET /api/pincode/districts
// @access  Public
exports.getAllDistricts = asyncHandler(async (req, res) => {
  const districts = pincodeService.getKeralaDistricts();

  res.status(200).json({
    success: true,
    count: districts.length,
    districts: districts,
  });
});

// @desc    Verify Kerala address
// @route   POST /api/pincode/verify-address
// @access  Public
exports.verifyAddress = asyncHandler(async (req, res) => {
  const { pincode, city, state } = req.body;

  if (!pincode) {
    return res.status(400).json({
      success: false,
      message: "PIN code is required",
    });
  }

  const result = await pincodeService.verifyAddress(pincode, city, state);

  if (result.isValid === false) {
    return res.status(400).json({
      success: false,
      message: result.message,
      suggestions: result.suggestions,
      isOutsideServiceArea: result.isOutsideServiceArea || false,
    });
  }

  res.status(200).json({
    success: true,
    message: result.message,
    data: result.data,
  });
});

// @desc    Auto-fill Kerala address from PIN code
// @route   GET /api/pincode/autofill/:pincode
// @access  Public
exports.autofillAddress = asyncHandler(async (req, res) => {
  const { pincode } = req.params;

  const result = await pincodeService.validatePincode(pincode);

  if (!result.isValid) {
    return res.status(400).json({
      success: false,
      message: result.message,
      isOutsideServiceArea: result.isOutsideServiceArea || false,
    });
  }

  // return simplified data for form autofill
  const autofillData = {
    city: result.data.district,
    state: "Kerala",
    country: "India",
    postalCode: pincode,
  };

  res.status(200).json({
    success: true,
    message: "Address details retrieved",
    data: autofillData,
  });
});

// @desc    Get delivery information for PIN code
// @route   GET /api/pincode/delivery-info/:pincode
// @access  Public
exports.getDeliveryInfo = asyncHandler(async (req, res) => {
  const { pincode } = req.params;

  const result = await pincodeService.getDeliveryInfo(pincode);

  if (result.canDeliver === false) {
    return res.status(400).json({
      success: false,
      message: result.message,
      canDeliver: false,
    });
  }

  res.status(200).json({
    success: true,
    canDeliver: result.canDeliver,
    estimatedDays: result.estimatedDays,
    district: result.district,
    deliveryCharge: result.deliveryCharge,
    message: `Estimated delivery: ${result.estimatedDays} days. Delivery charge: ₹${result.deliveryCharge}`,
  });
});

// @desc    Check service availability
// @route   GET /api/pincode/service-areas
// @access  Public
exports.getServiceAreas = asyncHandler(async (req, res) => {
  const districts = pincodeService.getKeralaDistricts();

  res.status(200).json({
    success: true,
    message: "We currently deliver only within Kerala",
    state: "Kerala",
    districts: districts,
    totalDistricts: districts.length,
  });
});
