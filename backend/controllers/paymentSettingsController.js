// controllers/paymentSettingsController.js

const PaymentSettings = require("../models/PaymentSettings");
const asyncHandler = require("../utils/asyncHandler");

// @desc    Get payment settings
// @route   GET /api/payment-settings
// @access  Public (needed for checkout page)
exports.getPaymentSettings = asyncHandler(async (req, res) => {
  const settings = await PaymentSettings.getSettings();

  res.status(200).json({
    success: true,
    data: {
      razorpayEnabled: settings.razorpayEnabled,
      codEnabled: settings.codEnabled,
      paymentGatewayMode: settings.paymentGatewayMode,
    },
  });
});

// @desc    Update payment settings
// @route   PUT /api/payment-settings
// @access  Private/Admin
exports.updatePaymentSettings = asyncHandler(async (req, res) => {
  const { razorpayEnabled, codEnabled, paymentGatewayMode } = req.body;

  // Validate: At least one payment method must be enabled
  if (!razorpayEnabled && !codEnabled) {
    return res.status(400).json({
      success: false,
      message: "At least one payment method must be enabled",
    });
  }

  let settings = await PaymentSettings.getSettings();

  // Update settings
  settings.razorpayEnabled =
    razorpayEnabled !== undefined ? razorpayEnabled : settings.razorpayEnabled;
  settings.codEnabled =
    codEnabled !== undefined ? codEnabled : settings.codEnabled;
  settings.paymentGatewayMode =
    paymentGatewayMode || settings.paymentGatewayMode;
  settings.updatedBy = req.user.id;
  settings.lastUpdatedAt = new Date();

  await settings.save();

  res.status(200).json({
    success: true,
    message: "Payment settings updated successfully",
    data: {
      razorpayEnabled: settings.razorpayEnabled,
      codEnabled: settings.codEnabled,
      paymentGatewayMode: settings.paymentGatewayMode,
    },
  });
});

// @desc    Get available payment methods for checkout
// @route   GET /api/payment-settings/available-methods
// @access  Public
exports.getAvailablePaymentMethods = asyncHandler(async (req, res) => {
  const settings = await PaymentSettings.getSettings();

  const availableMethods = [];

  if (settings.razorpayEnabled) {
    availableMethods.push({
      id: "razorpay",
      name: "Razorpay",
      description:
        "Pay securely using Credit Card, Debit Card, UPI, Net Banking",
      enabled: true,
    });
  }

  if (settings.codEnabled) {
    availableMethods.push({
      id: "cod",
      name: "Cash on Delivery",
      description: "Pay with cash when your order is delivered",
      enabled: true,
    });
  }

  res.status(200).json({
    success: true,
    data: {
      methods: availableMethods,
      hasRazorpay: settings.razorpayEnabled,
      hasCOD: settings.codEnabled,
    },
  });
});
