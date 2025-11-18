// models/PromoCode.js
const mongoose = require("mongoose");

const promoCodeSchema = new mongoose.Schema(
  {
    // Basic Information
    code: {
      type: String,
      required: [true, "Promo code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [3, "Code must be at least 3 characters"],
      maxlength: [20, "Code cannot exceed 20 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [200, "Description cannot exceed 200 characters"],
    },

    // Discount Details
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
      default: "percentage",
    },
    discountValue: {
      type: Number,
      required: [true, "Discount value is required"],
      min: [0, "Discount value cannot be negative"],
    },

    // Usage Limits
    maxUsageCount: {
      type: Number,
      default: null, // null = unlimited
      min: [1, "Max usage must be at least 1"],
    },
    currentUsageCount: {
      type: Number,
      default: 0,
    },
    maxUsagePerUser: {
      type: Number,
      default: 1,
      min: [1, "Max usage per user must be at least 1"],
    },

    // Minimum Order Requirements
    minOrderAmount: {
      type: Number,
      default: 0,
      min: [0, "Minimum order amount cannot be negative"],
    },

    // Maximum Discount Cap (for percentage discounts)
    maxDiscountAmount: {
      type: Number,
      default: null, // null = no cap
      min: [0, "Max discount amount cannot be negative"],
    },

    // Validity Period
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
      validate: {
        validator: function (value) {
          return value > this.startDate;
        },
        message: "End date must be after start date",
      },
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Applicable Products/Categories
    applicableProducts: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Product",
      },
    ],
    applicableCategories: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Category",
      },
    ],
    isApplicableToAll: {
      type: Boolean,
      default: true,
    },

    // User Restrictions
    applicableUsers: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
    ],
    isApplicableToAllUsers: {
      type: Boolean,
      default: true,
    },

    // First Order Only
    firstOrderOnly: {
      type: Boolean,
      default: false,
    },

    // Usage Tracking
    usedBy: [
      {
        user: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        usedAt: {
          type: Date,
          default: Date.now,
        },
        order: {
          type: mongoose.Schema.ObjectId,
          ref: "Order",
        },
        discountAmount: Number,
      },
    ],

    // Creator
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
promoCodeSchema.index({ code: 1 });
promoCodeSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
promoCodeSchema.index({ createdAt: -1 });

// Virtual for remaining usage count
promoCodeSchema.virtual("remainingUsageCount").get(function () {
  if (this.maxUsageCount === null) return Infinity;
  return this.maxUsageCount - this.currentUsageCount;
});

// Virtual for validity status
promoCodeSchema.virtual("isValid").get(function () {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.startDate &&
    now <= this.endDate &&
    (this.maxUsageCount === null || this.currentUsageCount < this.maxUsageCount)
  );
});

// Method to check if user can use this promo code
promoCodeSchema.methods.canUserUse = function (userId) {
  // Check if applicable to all users
  if (!this.isApplicableToAllUsers) {
    const isApplicable = this.applicableUsers.some(
      (id) => id.toString() === userId.toString()
    );
    if (!isApplicable) return false;
  }

  // Check per-user usage limit
  const userUsageCount = this.usedBy.filter(
    (usage) => usage.user.toString() === userId.toString()
  ).length;

  return userUsageCount < this.maxUsagePerUser;
};

// Method to calculate discount
promoCodeSchema.methods.calculateDiscount = function (orderAmount) {
  let discount = 0;

  if (this.discountType === "percentage") {
    discount = (orderAmount * this.discountValue) / 100;

    // Apply max discount cap if exists
    if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
      discount = this.maxDiscountAmount;
    }
  } else {
    // Fixed discount
    discount = this.discountValue;
  }

  // Discount cannot exceed order amount
  return Math.min(discount, orderAmount);
};

module.exports = mongoose.model("PromoCode", promoCodeSchema);
