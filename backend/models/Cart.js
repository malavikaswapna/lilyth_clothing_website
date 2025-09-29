const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  
  items: [{
    product: {
      type: mongoose.Schema.ObjectId,
      ref: 'Product',
      required: true
    },
    variant: {
      size: {
        type: String,
        required: true
      },
      color: {
        name: String,
        hexCode: String
      }
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      max: [10, 'Maximum quantity is 10']
    },
    priceAtAdd: {
      type: Number,
      required: true // Price when item was added to cart
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Cart totals (calculated)
  subtotal: {
    type: Number,
    default: 0
  },
  itemCount: {
    type: Number,
    default: 0
  },
  
  // Cart status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Saved for later
  savedItems: [{
    product: {
      type: mongoose.Schema.ObjectId,
      ref: 'Product'
    },
    variant: {
      size: String,
      color: {
        name: String,
        hexCode: String
      }
    },
    savedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total items
cartSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Index
cartSchema.index({ user: 1 }, { unique: true }); 
cartSchema.index({ 'items.product': 1 });

// Pre-save middleware to calculate totals
cartSchema.pre('save', function(next) {
  this.itemCount = this.items.length;
  this.subtotal = this.items.reduce((total, item) => {
    return total + (item.quantity * item.priceAtAdd);
  }, 0);
  next();
});

module.exports = mongoose.model('Cart', cartSchema);