const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Review Content
  title: {
    type: String,
    required: [true, 'Review title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Review content is required'],
    maxlength: [2000, 'Review cannot exceed 2000 characters']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  
  // References
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: true
  },
  order: {
    type: mongoose.Schema.ObjectId,
    ref: 'Order'
  },
  
  // Purchase Verification
  isVerifiedPurchase: {
    type: Boolean,
    default: false
  },
  
  // Review Details
  pros: [String],
  cons: [String],
  
  // Fit and Sizing (for clothing)
  sizing: {
    purchasedSize: String,
    userSize: String,
    fit: {
      type: String,
      enum: ['too_small', 'small', 'perfect', 'large', 'too_large']
    },
    height: String,
    weight: String
  },
  
  // Media
  images: [{
    url: String,
    caption: String
  }],
  
  // Helpfulness
  helpfulCount: {
    type: Number,
    default: 0
  },
  helpfulVotes: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    isHelpful: Boolean,
    votedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'pending'
  },
  isRecommended: {
    type: Boolean,
    default: true
  },
  
  // Moderation
  flaggedBy: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    reason: String,
    flaggedAt: {
      type: Date,
      default: Date.now
    }
  }],
  moderatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  moderatedAt: Date,
  moderationNote: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to ensure one review per user per product
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

// Other indexes
reviewSchema.index({ product: 1, status: 1, createdAt: -1 });
reviewSchema.index({ rating: -1 });
reviewSchema.index({ helpfulCount: -1 });

// Virtual for review age
reviewSchema.virtual('reviewAge').get(function() {
  return Date.now() - this.createdAt;
});

module.exports = mongoose.model('Review', reviewSchema);