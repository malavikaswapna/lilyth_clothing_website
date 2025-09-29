// controllers/reviewController.js
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { auditLogger } = require('../utils/auditLogger');
const mongoose = require('mongoose');

// @desc    Get reviews for a product
// @route   GET /api/products/:productId/reviews
// @access  Public
exports.getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  
  // Validate productId
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid product ID format'
    });
  }
  console.log('=== GET PRODUCT REVIEWS ===');
  console.log('Product ID from params:', productId);

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  // Build query
  let query = { 
    product: productId, 
    // status: 'approved' 
  };

  console.log('Query:', query);

  // Filter by rating
  if (req.query.rating) {
    query.rating = parseInt(req.query.rating);
  }

  // Filter by verified purchase
  if (req.query.verified === 'true') {
    query.isVerifiedPurchase = true;
  }

  // Sort options
  let sortBy = { createdAt: -1 }; // Default: newest first
  if (req.query.sort === 'helpful') {
    sortBy = { helpfulCount: -1 };
  } else if (req.query.sort === 'rating_high') {
    sortBy = { rating: -1 };
  } else if (req.query.sort === 'rating_low') {
    sortBy = { rating: 1 };
  }

  const reviews = await Review.find(query)
    .populate('user', 'firstName lastName')
    .sort(sortBy)
    .skip(startIndex)
    .limit(limit);

  console.log('Found reviews:', reviews.length);
  console.log('Reviews:', reviews);

  const total = await Review.countDocuments(query);
  console.log('Total reviews:', total);

  // Get rating summary
  const ratingStats = await Review.aggregate([
    { $match: { product: productId, status: 'approved' } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    }
  ]);

  const ratingBreakdown = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0
  };
  
  ratingStats.forEach(stat => {
    ratingBreakdown[stat._id] = stat.count;
  });

  res.status(200).json({
    success: true,
    count: reviews.length,
    total,
    pagination: {
      page,
      pages: Math.ceil(total / limit),
      limit,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    },
    ratingBreakdown,
    reviews
  });
});

// @desc    Create a review
// @route   POST /api/products/:productId/reviews
// @access  Private
exports.createReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const {
    title,
    content,
    rating,
    pros,
    cons,
    sizing,
    isRecommended
  } = req.body;

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  // Check if user already reviewed this product
  const existingReview = await Review.findOne({
    user: req.user._id,
    product: productId
  });

  if (existingReview) {
    return res.status(400).json({
      success: false,
      message: 'You have already reviewed this product'
    });
  }

  // Check if user purchased this product
  const userOrder = await Order.findOne({
    user: req.user._id,
    'items.product': productId,
    status: 'delivered'
  });

  const review = await Review.create({
    title,
    content,
    rating,
    user: req.user.i_d,
    product: productId,
    order: userOrder ? userOrder._id : null,
    isVerifiedPurchase: !!userOrder,
    pros: pros || [],
    cons: cons || [],
    sizing,
    isRecommended: isRecommended !== undefined ? isRecommended : true
  });

  // Update product rating
  await updateProductRating(productId);

  // Populate user info for response
  await review.populate('user', 'firstName lastName');

  // Log audit trail
  await auditLogger.log({
    userId: req.user._id,
    userName: `${req.user.firstName} ${req.user.lastName}`,
    userEmail: req.user.email,
    action: 'REVIEW_CREATED',
    resource: 'review',
    resourceId: review._id,
    details: { productId, rating },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(201).json({
    success: true,
    message: 'Review submitted successfully',
    review
  });
});

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private
exports.updateReview = asyncHandler(async (req, res) => {
  let review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found'
    });
  }

  // Check if req.user exists
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Check ownership
  if (review.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this review'
    });
  }

  const oldRating = review.rating;

  review = await Review.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('user', 'firstName lastName');

  // Update product rating if rating changed
  if (oldRating !== review.rating) {
    await updateProductRating(review.product);
  }

  res.status(200).json({
    success: true,
    message: 'Review updated successfully',
    review
  });
});

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private
exports.deleteReview = asyncHandler(async (req, res) => {
  console.log('=== DELETE REVIEW START ===');
  console.log('Review ID:', req.params.id);
  
  const review = await Review.findById(req.params.id);

  if (!review) {
    console.log('Review not found');
    return res.status(404).json({
      success: false,
      message: 'Review not found'
    });
  }

  console.log('Delete review debug:');
  console.log('Review user ID:', review.user.toString());
  console.log('Logged in user ID:', req.user._id.toString());
  console.log('User role:', req.user.role);
  console.log('IDs match:', review.user.toString() === req.user._id.toString());

  if (!req.user) {
    console.log('No user in request');
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Check ownership or admin
  if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    console.log('Authorization failed - user cannot delete this review');
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this review'
    });
  }

  console.log('Authorization passed - attempting to delete');

  try {
    await review.deleteOne();
    console.log('Review deleted successfully');
    
    await updateProductRating(review.product);
    console.log('Product rating updated');
    
    console.log('=== DELETE REVIEW SUCCESS ===');
    
    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.log('Error during deletion:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting review'
    });
  }
});

// @desc    Mark review as helpful/not helpful
// @route   POST /api/reviews/:id/helpful
// @access  Private
exports.markHelpful = asyncHandler(async (req, res) => {
  const { isHelpful } = req.body;
  const review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found'
    });
  }

  // Check if user already voted
  const existingVote = review.helpfulVotes.find(
    vote => vote.user.toString() === req.user._id.toString()
  );

  if (existingVote) {
    // Update existing vote
    existingVote.isHelpful = isHelpful;
  } else {
    // Add new vote
    review.helpfulVotes.push({
      user: req.user._id,
      isHelpful
    });
  }

  // Recalculate helpful count
  review.helpfulCount = review.helpfulVotes.filter(vote => vote.isHelpful).length;

  await review.save();

  res.status(200).json({
    success: true,
    message: 'Vote recorded successfully',
    helpfulCount: review.helpfulCount
  });
});

// @desc    Flag review
// @route   POST /api/reviews/:id/flag
// @access  Private
exports.flagReview = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found'
    });
  }

  // Check if user already flagged
  const existingFlag = review.flaggedBy.find(
    flag => flag.user.toString() === req.user._id.toString()
  );

  if (existingFlag) {
    return res.status(400).json({
      success: false,
      message: 'You have already flagged this review'
    });
  }

  review.flaggedBy.push({
    user: req.user._id,
    reason
  });

  // Auto-flag if multiple reports
  if (review.flaggedBy.length >= 3) {
    review.status = 'flagged';
  }

  await review.save();

  res.status(200).json({
    success: true,
    message: 'Review flagged successfully'
  });
});

// @desc    Get user's reviews
// @route   GET /api/user/reviews
// @access  Private
exports.getUserReviews = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  const reviews = await Review.find({ user: req.user._id })
    .populate('product', 'name images slug')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  const total = await Review.countDocuments({ user: req.user._id });

  res.status(200).json({
    success: true,
    count: reviews.length,
    total,
    pagination: {
      page,
      pages: Math.ceil(total / limit),
      limit,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    },
    reviews
  });
});

// Admin routes

// @desc    Get all reviews (Admin)
// @route   GET /api/admin/reviews
// @access  Private/Admin
exports.getAllReviews = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;

  let query = {};

  // Filter by status
  if (req.query.status) {
    query.status = req.query.status;
  }

  // Filter by rating
  if (req.query.rating) {
    query.rating = parseInt(req.query.rating);
  }

  // Search
  if (req.query.search) {
    query.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { content: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  const reviews = await Review.find(query)
    .populate('user', 'firstName lastName email')
    .populate('product', 'name slug')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  const total = await Review.countDocuments(query);

  res.status(200).json({
    success: true,
    count: reviews.length,
    total,
    pagination: {
      page,
      pages: Math.ceil(total / limit),
      limit,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    },
    reviews
  });
});

// @desc    Moderate review (Admin)
// @route   PUT /api/admin/reviews/:id/moderate
// @access  Private/Admin
exports.moderateReview = asyncHandler(async (req, res) => {
  const { status, moderationNote } = req.body;

  const review = await Review.findByIdAndUpdate(
    req.params.id,
    {
      status,
      moderationNote,
      moderatedBy: req.user.id,
      moderatedAt: new Date()
    },
    { new: true, runValidators: true }
  ).populate('user', 'firstName lastName')
   .populate('product', 'name');

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found'
    });
  }

  // Update product rating if approved/rejected
  if (status === 'approved' || status === 'rejected') {
    await updateProductRating(review.product._id);
  }

  // Log audit trail
  await auditLogger.log({
    userId: req.user._id,
    userName: `${req.user.firstName} ${req.user.lastName}`,
    userEmail: req.user.email,
    action: 'REVIEW_MODERATED',
    resource: 'review',
    resourceId: review._id,
    details: { status, moderationNote },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(200).json({
    success: true,
    message: 'Review moderated successfully',
    review
  });
});

exports.getReviewStats = asyncHandler(async (req, res) => {
  const totalReviews = await Review.countDocuments();
  const pendingReviews = await Review.countDocuments({ status: 'pending' });
  const flaggedReviews = await Review.countDocuments({ status: 'flagged' });
  const approvedReviews = await Review.countDocuments({ status: 'approved' });
  
  const ratingDistribution = await Review.aggregate([
    { $match: { status: 'approved' } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const averageRating = await Review.aggregate([
    { $match: { status: 'approved' } },
    {
      $group: {
        _id: null,
        average: { $avg: '$rating' }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    stats: {
      totalReviews,
      pendingReviews,
      flaggedReviews,
      approvedReviews,
      averageRating: averageRating[0]?.average || 0,
      ratingDistribution
    }
  });
});

// Helper function to update product rating
const updateProductRating = async (productId) => {
  try {
    // Validate productId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      console.error('Invalid productId provided to updateProductRating:', productId);
      return;
    }

    const stats = await Review.aggregate([
      { $match: { product: productId, status: 'approved' } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      }
    ]);

    const averageRating = stats.length > 0 ? Math.round(stats[0].averageRating * 10) / 10 : 0;
    const reviewCount = stats.length > 0 ? stats[0].reviewCount : 0;

    await Product.findByIdAndUpdate(productId, {
      averageRating,
      reviewCount
    });
  } catch (error) {
    console.error('Error updating product rating:', error);
  }
};