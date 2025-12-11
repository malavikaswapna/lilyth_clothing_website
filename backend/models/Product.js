// models/Product.js

const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    // basic Information
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [200, "Product name cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    shortDescription: {
      type: String,
      maxlength: [500, "Short description cannot exceed 500 characters"],
    },

    // product Details
    brand: {
      type: String,
      required: [true, "Brand is required"],
      trim: true,
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    subcategory: {
      type: String,
      trim: true,
    },

    // pricing
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    salePrice: {
      type: Number,
      min: [0, "Sale price cannot be negative"],
      validate: {
        validator: function (value) {
          return !value || value < this.price;
        },
        message: "Sale price must be less than regular price",
      },
    },
    costPrice: {
      type: Number,
      min: [0, "Cost price cannot be negative"],
    },

    // inventory and Variants
    sku: {
      type: String,
      required: [true, "SKU is required"],
      uppercase: true,
    },

    // size and color variants
    variants: [
      {
        size: {
          type: String,
          required: true,
          enum: [
            "XS",
            "S",
            "M",
            "L",
            "XL",
            "XXL",
            "0",
            "2",
            "4",
            "6",
            "8",
            "10",
            "12",
            "14",
            "16",
            "18",
            "20",
          ],
        },
        color: {
          name: {
            type: String,
            required: true,
          },
          hexCode: {
            type: String,
            match: [
              /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
              "Invalid hex color code",
            ],
          },
        },
        stock: {
          type: Number,
          required: true,
          min: [0, "Stock cannot be negative"],
          default: 0,
        },
        variantSku: {
          type: String,
          required: true,
        },
      },
    ],

    // total stock (calculated from variants)
    totalStock: {
      type: Number,
      default: 0,
    },

    // images
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          required: false,
        },
        alt: {
          type: String,
          default: "",
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
        colorVariant: String,
      },
    ],

    // product Specifications
    materials: [String],
    careInstructions: [String],
    features: [String],

    // measurements (for clothing)
    measurements: {
      bust: String,
      waist: String,
      hips: String,
      length: String,
      sleeves: String,
    },

    // SEO and marketing
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    metaTitle: String,
    metaDescription: String,
    tags: [String],

    // status and visibility
    status: {
      type: String,
      enum: ["active", "inactive", "draft", "discontinued"],
      default: "draft",
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
    },

    // analytics and performance
    views: {
      type: Number,
      default: 0,
    },
    purchases: {
      type: Number,
      default: 0,
    },
    revenue: {
      type: Number,
      default: 0,
    },

    // reviews summary (calculated)
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },

    // dates
    launchDate: {
      type: Date,
      default: Date.now,
    },
    discontinuedDate: Date,

    // weight and shipping
    weight: {
      type: Number,
      min: 0,
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// virtual to handle both 'featured' and 'isFeatured'
productSchema.virtual("featured").get(function () {
  return this.isFeatured;
});

productSchema.virtual("featured").set(function (value) {
  this.isFeatured = value;
});

// also add to the toJSON options to include virtuals
productSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    // Ensure consistent naming in responses
    ret.featured = ret.isFeatured;
    return ret;
  },
});

// virtual for current price (sale price if available, otherwise regular price)
productSchema.virtual("currentPrice").get(function () {
  return this.salePrice || this.price;
});

// virtual for discount percentage
productSchema.virtual("discountPercentage").get(function () {
  if (this.salePrice && this.price > this.salePrice) {
    return Math.round(((this.price - this.salePrice) / this.price) * 100);
  }
  return 0;
});

// virtual for availability
productSchema.virtual("isAvailable").get(function () {
  return this.status === "active" && this.totalStock > 0;
});

// indexes for better performance
productSchema.index({ category: 1, status: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ "variants.size": 1, "variants.color.name": 1 });

// pre-save middleware to calculate total stock
productSchema.pre("save", function (next) {
  // calculate total stock from all variants
  if (this.variants && this.variants.length > 0) {
    this.totalStock = this.variants.reduce((total, variant) => {
      return total + (variant.stock || 0);
    }, 0);
  } else {
    this.totalStock = 0;
  }

  console.log(`Pre-save hook: Calculated totalStock = ${this.totalStock}`);
  next();
});

module.exports = mongoose.model("Product", productSchema);
