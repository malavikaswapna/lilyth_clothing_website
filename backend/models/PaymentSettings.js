// models/PaymentSettings.js

const mongoose = require("mongoose");

const paymentSettingsSchema = new mongoose.Schema(
  {
    // Razorpay Settings
    razorpayEnabled: {
      type: Boolean,
      default: true,
    },

    // COD Settings
    codEnabled: {
      type: Boolean,
      default: true,
    },

    // Additional settings (for future use)
    paymentGatewayMode: {
      type: String,
      enum: ["test", "live"],
      default: "test",
    },

    // Metadata
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one settings document exists
paymentSettingsSchema.index({}, { unique: true });

// Static method to get or create settings
paymentSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();

  if (!settings) {
    settings = await this.create({
      razorpayEnabled: true,
      codEnabled: true,
      paymentGatewayMode: "test",
    });
  }

  return settings;
};

module.exports = mongoose.model("PaymentSettings", paymentSettingsSchema);
