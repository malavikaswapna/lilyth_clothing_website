const mongoose = require("mongoose");

const storeSettingsSchema = new mongoose.Schema(
  {
    // Only one document should exist - we'll use a singleton pattern
    _id: {
      type: String,
      default: "store_settings",
    },

    // Basic Store Information
    storeName: {
      type: String,
      default: "LILYTH",
      trim: true,
      maxlength: [100, "Store name cannot exceed 100 characters"],
    },
    storeDescription: {
      type: String,
      default: "Discover Your Perfect Style",
      maxlength: [500, "Store description cannot exceed 500 characters"],
    },

    // Localization
    currency: {
      type: String,
      enum: ["INR", "USD", "EUR", "GBP"],
      default: "INR",
    },
    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },
    language: {
      type: String,
      enum: ["en", "hi", "ml"], // English, Hindi, Malayalam
      default: "en",
    },

    // Tax Configuration
    taxRate: {
      type: Number,
      default: 18, // GST rate in India
      min: [0, "Tax rate cannot be negative"],
      max: [100, "Tax rate cannot exceed 100%"],
    },

    // Shipping Configuration
    freeShippingThreshold: {
      type: Number,
      default: 2000,
      min: [0, "Free shipping threshold cannot be negative"],
    },
    standardShippingCost: {
      type: Number,
      default: 99,
      min: [0, "Shipping cost cannot be negative"],
    },
    expressShippingCost: {
      type: Number,
      default: 199,
      min: [0, "Express shipping cost cannot be negative"],
    },

    // Business Configuration
    businessInfo: {
      registrationNumber: String,
      gstNumber: String,
      address: String,
      city: String,
      state: {
        type: String,
        default: "Kerala",
      },
      country: {
        type: String,
        default: "India",
      },
      postalCode: String,
      phone: String,
      email: String,
    },

    // Feature Flags
    features: {
      reviewsEnabled: {
        type: Boolean,
        default: true,
      },
      wishlistEnabled: {
        type: Boolean,
        default: true,
      },
      guestCheckoutEnabled: {
        type: Boolean,
        default: false,
      },
      codEnabled: {
        type: Boolean,
        default: true,
      },
    },

    // Last Updated By
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    // Disable _id auto-generation since we're using a custom _id
    _id: false,
  }
);

// Static method to get or create settings
storeSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findById("store_settings");

  // If settings don't exist, create with defaults
  if (!settings) {
    settings = await this.create({ _id: "store_settings" });
  }

  return settings;
};

// Static method to update settings
storeSettingsSchema.statics.updateSettings = async function (updates, userId) {
  const settings = await this.findByIdAndUpdate(
    "store_settings",
    {
      ...updates,
      updatedBy: userId,
    },
    {
      new: true,
      upsert: true, // Create if doesn't exist
      runValidators: true,
    }
  );

  return settings;
};

module.exports = mongoose.model("StoreSettings", storeSettingsSchema);
