// routes/reviews.js - CLEAN VERSION
const express = require("express");
const {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
  flagReview,
  getUserReviews,
  getAllReviews,
  moderateReview,
} = require("../controllers/reviewController");
const { protect, authorize } = require("../middleware/auth");

// mergeParams: true allows access to parent route params (productId)
// This is needed for /products/:productId/reviews
// For /api/reviews/:id, it just passes through the :id param normally
const router = express.Router({ mergeParams: true });

// Specific routes MUST come before /:id routes
router.get("/user/reviews", protect, getUserReviews);
router.get("/admin/all", protect, authorize("admin"), getAllReviews);

// Product review routes
router.get("/", getProductReviews);
router.post("/", protect, createReview);

// ID-based routes (work for both /api/reviews/:id and /products/:productId/reviews/:id)
router.put("/:id", protect, updateReview);
router.delete("/:id", protect, deleteReview);
router.post("/:id/helpful", protect, markHelpful);
router.post("/:id/flag", protect, flagReview);
router.put("/:id/moderate", protect, authorize("admin"), moderateReview);

module.exports = router;
