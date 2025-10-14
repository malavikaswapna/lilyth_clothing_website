const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    // Order Identification
    orderNumber: {
      type: String,
      uppercase: true,
    },

    // Customer Information
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },

    // Order Items
    items: [
      {
        product: {
          type: mongoose.Schema.ObjectId,
          ref: "Product",
          required: true,
        },
        productName: {
          type: String,
          required: true, // Store name at time of order
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

    // Pricing
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

    // Addresses
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

    // Payment Information
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
        ],
        default: "pending",
      },
      transactionId: String,
      razorpayOrderId: String, // Add this
      stripePaymentIntentId: String,
      paidAt: Date,
      refundedAt: Date,
      refundAmount: {
        type: Number,
        default: 0,
      },
    },

    // Order Status and Tracking
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

    // Status History
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

    // Shipping and Tracking
    tracking: {
      carrier: String,
      trackingNumber: String,
      trackingUrl: String,
      shippedAt: Date,
      estimatedDelivery: Date,
      deliveredAt: Date,
    },

    // Customer Communication
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

    // Special Instructions
    specialInstructions: String,
    giftMessage: String,
    isGift: {
      type: Boolean,
      default: false,
    },

    // Return Information
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for order age
orderSchema.virtual("orderAge").get(function () {
  return Date.now() - this.createdAt;
});

// Virtual for formatted order number
orderSchema.virtual("formattedOrderNumber").get(function () {
  return `WF${this.orderNumber}`;
});

// Indexes
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ "payment.status": 1 });
orderSchema.index({ createdAt: -1 });

// Pre-save middleware to generate order number
orderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = String(count + 1).padStart(6, "0");
  }
  next();
});

// Pre-save middleware to calculate totals
orderSchema.pre("save", function (next) {
  // Calculate item totals
  this.items.forEach((item) => {
    item.totalPrice = item.quantity * item.unitPrice;
  });

  // Calculate subtotal
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);

  // Calculate final total
  this.total =
    this.subtotal + this.shipping.cost + this.tax - this.discount.amount;

  next();
});

module.exports = mongoose.model("Order", orderSchema);
