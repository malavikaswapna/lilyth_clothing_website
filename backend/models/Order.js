// models/Order.js

const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    // ✅ ADD: Guest order tracking
    isGuestOrder: {
      type: Boolean,
      default: false,
    },

    guestEmail: {
      type: String,
      lowercase: true,
      sparse: true, // Only for guest orders
    },

    // ✅ ADD: Order tracking token for guest users
    trackingToken: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    // order Identification
    orderNumber: {
      type: String,
      uppercase: true,
    },

    // customer Information
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },

    // order Items
    items: [
      {
        product: {
          type: mongoose.Schema.ObjectId,
          ref: "Product",
          required: true,
        },
        productName: {
          type: String,
          required: true,
        },
        productImage: String,
        variant: {
          size: String,
          color: {
            name: String,
            hexCode: String,
          },
          sku: String,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, "Quantity must be at least 1"],
        },
        unitPrice: {
          type: Number,
          required: true,
          min: [0, "Unit price cannot be negative"],
        },
        totalPrice: {
          type: Number,
          required: true,
        },
      },
    ],

    // pricing
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shipping: {
      cost: {
        type: Number,
        default: 0,
        min: 0,
      },
      method: {
        type: String,
        enum: ["standard", "expedited", "overnight", "pickup"],
        default: "standard",
      },
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      amount: {
        type: Number,
        default: 0,
        min: 0,
      },
      code: String,
      type: {
        type: String,
        enum: ["percentage", "fixed"],
        default: "fixed",
      },
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },

    // addresses
    shippingAddress: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      company: String,
      addressLine1: { type: String, required: true },
      addressLine2: String,
      city: { type: String, required: true },
      state: {
        type: String,
        required: true,
        default: "Kerala",
        validate: {
          validator: function (v) {
            return v.toLowerCase() === "kerala";
          },
          message: "We currently only deliver within Kerala",
        },
      },
      postalCode: {
        type: String,
        required: true,
        validate: {
          validator: function (v) {
            return /^\d{6}$/.test(v);
          },
          message: "PIN code must be 6 digits",
        },
      },
      country: { type: String, required: true, default: "India" },
    },
    billingAddress: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      company: String,
      addressLine1: { type: String, required: true },
      addressLine2: String,
      city: { type: String, required: true },
      state: {
        type: String,
        required: true,
        default: "Kerala",
        validate: {
          validator: function (v) {
            return v.toLowerCase() === "kerala";
          },
          message: "We currently only deliver within Kerala",
        },
      },
      postalCode: {
        type: String,
        required: true,
        validate: {
          validator: function (v) {
            return /^\d{6}$/.test(v);
          },
          message: "PIN code must be 6 digits",
        },
      },
      country: { type: String, required: true, default: "India" },
    },

    // payment Information
    payment: {
      method: {
        type: String,
        enum: [
          "credit_card",
          "debit_card",
          "paypal",
          "apple_pay",
          "google_pay",
          "razorpay",
          "cash_on_delivery",
        ],
        required: true,
      },
      status: {
        type: String,
        enum: [
          "pending",
          "processing",
          "completed",
          "failed",
          "refunded",
          "partially_refunded",
          "refund_pending",
        ],
        default: "pending",
      },
      transactionId: String,
      razorpayOrderId: String,
      razorpayPaymentId: String,
      stripePaymentIntentId: String,
      paidAt: Date,
      refundedAt: Date,
      refundAmount: {
        type: Number,
        default: 0,
      },
      refundId: String,
      refundStatus: String,
      refundNotes: String,
      // ✅ NEW: Additional refund tracking for COD
      refundTransactionId: String,
      refundMethod: {
        type: String,
        enum: ["razorpay", "bank_transfer", "upi", "manual"],
      },
    },

    // ✅ UPDATED: Payment method - NOT required for backward compatibility
    paymentMethod: {
      type: String,
      enum: ["razorpay", "cod"],
      // removed required: true to support existing orders
    },

    // discount/Promo Code
    discount: {
      amount: {
        type: Number,
        default: 0,
        min: 0,
      },
      code: String,
      promoCode: {
        type: mongoose.Schema.ObjectId,
        ref: "PromoCode",
      },
      type: {
        type: String,
        enum: ["percentage", "fixed", "none"],
        default: "none",
      },
    },

    // order Status and Tracking
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ],
      default: "pending",
    },

    // status History
    statusHistory: [
      {
        status: {
          type: String,
          enum: [
            "pending",
            "confirmed",
            "processing",
            "shipped",
            "delivered",
            "cancelled",
            "returned",
          ],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        note: String,
        updatedBy: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
      },
    ],

    // shipping and Tracking
    tracking: {
      carrier: String,
      trackingNumber: String,
      trackingUrl: String,
      shippedAt: Date,
      estimatedDelivery: Date,
      deliveredAt: Date,
    },

    // customer Communication
    notes: [
      {
        message: String,
        isCustomerVisible: {
          type: Boolean,
          default: false,
        },
        createdBy: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // special Instructions
    specialInstructions: String,
    giftMessage: String,
    isGift: {
      type: Boolean,
      default: false,
    },

    // return Information
    returnRequested: {
      type: Boolean,
      default: false,
    },
    returnReason: String,
    returnStatus: {
      type: String,
      enum: [
        "none",
        "requested",
        "approved",
        "rejected",
        "received",
        "processed",
      ],
      default: "none",
    },
    returnRequestedAt: Date,
    returnComments: String,
    returnAdminNotes: String,
    returnItems: [
      {
        itemId: mongoose.Schema.ObjectId,
        quantity: Number,
      },
    ],

    // ✅ NEW: Refund details for COD orders
    refundDetails: {
      method: {
        type: String,
        enum: ["bank_transfer", "upi", "store_credit"],
      },
      // Bank transfer details
      accountHolderName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      // UPI details
      upiId: String,
      // Collection timestamp
      collectedAt: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// virtual for order age
orderSchema.virtual("orderAge").get(function () {
  return Date.now() - this.createdAt;
});

// virtual for formatted order number
orderSchema.virtual("formattedOrderNumber").get(function () {
  return `WF${this.orderNumber}`;
});

// indexes
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ "payment.status": 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ returnRequested: 1, returnStatus: 1 });
orderSchema.index({ paymentMethod: 1 });

// ✅ ADD: Pre-save middleware to generate tracking token for guest orders
orderSchema.pre("save", async function (next) {
  if (this.isGuestOrder && !this.trackingToken) {
    const crypto = require("crypto");
    this.trackingToken = crypto.randomBytes(32).toString("hex");
  }
  next();
});

// ✅ NEW: Pre-save middleware to auto-detect paymentMethod from payment.method
orderSchema.pre("save", function (next) {
  // Auto-populate paymentMethod if not set
  if (!this.paymentMethod && this.payment && this.payment.method) {
    if (this.payment.method === "cash_on_delivery") {
      this.paymentMethod = "cod";
    } else if (this.payment.method === "razorpay") {
      this.paymentMethod = "razorpay";
    } else {
      // Default to razorpay for other payment methods
      this.paymentMethod = "razorpay";
    }
  }
  next();
});

// pre-save middleware to generate order number
orderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = String(count + 1).padStart(6, "0");
  }
  next();
});

// pre-save middleware to calculate totals
orderSchema.pre("save", function (next) {
  // calculate item totals
  this.items.forEach((item) => {
    item.totalPrice = item.quantity * item.unitPrice;
  });

  // calculate subtotal
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);

  // calculate final total
  this.total =
    this.subtotal + this.shipping.cost + this.tax - this.discount.amount;

  next();
});

module.exports = mongoose.model("Order", orderSchema);
