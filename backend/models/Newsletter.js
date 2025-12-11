// models/Newsletter.js
const mongoose = require("mongoose");

const newsletterSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    status: {
      type: String,
      enum: ["subscribed", "unsubscribed"],
      default: "subscribed",
    },
    source: {
      type: String,
      enum: ["footer", "checkout", "popup", "account"],
      default: "footer",
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    unsubscribedAt: {
      type: Date,
    },
    // For tracking engagement
    preferences: {
      newArrivals: {
        type: Boolean,
        default: true,
      },
      sales: {
        type: Boolean,
        default: true,
      },
      exclusiveOffers: {
        type: Boolean,
        default: true,
      },
    },
    metadata: {
      ipAddress: String,
      userAgent: String,
      referrer: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
newsletterSchema.index({ status: 1 });
newsletterSchema.index({ createdAt: -1 });

// Instance method to unsubscribe
newsletterSchema.methods.unsubscribe = function () {
  this.status = "unsubscribed";
  this.unsubscribedAt = new Date();
  return this.save();
};

// Instance method to resubscribe
newsletterSchema.methods.resubscribe = function () {
  this.status = "subscribed";
  this.unsubscribedAt = null;
  return this.save();
};

module.exports = mongoose.model("Newsletter", newsletterSchema);
