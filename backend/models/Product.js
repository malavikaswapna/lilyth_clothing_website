const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  shortDescription: {
    type: String,
    maxlength: [500, 'Short description cannot exceed 500 characters']
  },
  
  // Product Details
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true
  },
  category: {
    type: mongoose.Schema.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  subcategory: {
    type: String,
    trim: true
  },
  
  // Pricing
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  salePrice: {
    type: Number,
    min: [0, 'Sale price cannot be negative'],
    validate: {
      validator: function(value) {
        return !value || value < this.price;
      },
      message: 'Sale price must be less than regular price'
    }
  },
  costPrice: {
    type: Number,
    min: [0, 'Cost price cannot be negative']
  },
  
  // Inventory and Variants
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    uppercase: true
  },
  
  // Size and Color Variants
  variants: [{
    size: {
      type: String,
      required: true,
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20']
    },
    color: {
      name: {
        type: String,
        required: true
      },
      hexCode: {
        type: String,
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color code']
      }
    },
    stock: {
      type: Number,
      required: true,
      min: [0, 'Stock cannot be negative'],
      default: 0
    },
    variantSku: {
      type: String,
      required: true
    }
  }],
  
  // Total stock (calculated from variants)
  totalStock: {
    type: Number,
    default: 0
  },
  
  // Images
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: ''
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    colorVariant: String // Which color this image represents
  }],
  
  // Product Specifications
  materials: [String],
  careInstructions: [String],
  features: [String],
  
  // Measurements (for clothing)
  measurements: {
    bust: String,
    waist: String,
    hips: String,
    length: String,
    sleeves: String
  },
  
  // SEO and Marketing
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  metaTitle: String,
  metaDescription: String,
  tags: [String],
  
  // Status and Visibility
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft', 'discontinued'],
    default: 'draft'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isNewArrival: {
    type: Boolean,
    default: false
  },
  
  // Analytics and Performance
  views: {
    type: Number,
    default: 0
  },
  purchases: {
    type: Number,
    default: 0
  },
  revenue: {
    type: Number,
    default: 0
  },
  
  // Reviews Summary (calculated)
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  
  // Dates
  launchDate: {
    type: Date,
    default: Date.now
  },
  discontinuedDate: Date,
  
  // Weight and Shipping
  weight: {
    type: Number, // in pounds
    min: 0
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for current price (sale price if available, otherwise regular price)
productSchema.virtual('currentPrice').get(function() {
  return this.salePrice || this.price;
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.salePrice && this.price > this.salePrice) {
    return Math.round(((this.price - this.salePrice) / this.price) * 100);
  }
  return 0;
});

// Virtual for availability
productSchema.virtual('isAvailable').get(function() {
  return this.status === 'active' && this.totalStock > 0;
});

// Indexes for better performance
productSchema.index({ category: 1, status: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ slug: 1 });
productSchema.index({ 'variants.size': 1, 'variants.color.name': 1 });

// Pre-save middleware to calculate total stock
productSchema.pre('save', function(next) {
  this.totalStock = this.variants.reduce((total, variant) => total + variant.stock, 0);
  next();
});

// Pre-save middleware to generate slug
productSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);