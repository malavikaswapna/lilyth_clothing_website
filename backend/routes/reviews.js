// routes/reviews.js
const express = require('express');
const {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
  flagReview,
  getUserReviews,
  getAllReviews,
  moderateReview
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// Public routes
router.get('/', getProductReviews);
router.get('/my-reviews', getUserReviews);

// Admin routes first (more specific)
router.get('/admin/all', authorize('admin'), getAllReviews);
router.put('/:id/moderate', authorize('admin'), moderateReview);

// Protected routes with an id last
router.post('/', createReview);
router.put('/:id', protect, updateReview);
router.get('/user/reviews', protect, getUserReviews);
router.delete('/:id', protect, deleteReview);
router.post('/:id/helpful', markHelpful);
router.post('/:id/flag', flagReview);


module.exports = router;