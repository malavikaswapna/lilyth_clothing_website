// backend/routes/user.js
const express = require('express');
const {
  addAddress,
  updateAddress,
  deleteAddress,
  getAddresses,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  updatePreferredSizes,
  getUserAnalytics
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { getUserReviews } = require('../controllers/reviewController');

const router = express.Router();

// All user routes require authentication
router.use(protect);

// Address 
router.get('/addresses', getAddresses);
router.post('/addresses', addAddress);
router.put('/addresses/:addressId', updateAddress);
router.delete('/addresses/:addressId', deleteAddress);

// Wishlist
router.get('/wishlist', getWishlist);
router.post('/wishlist/:productId', addToWishlist);
router.delete('/wishlist/:productId', removeFromWishlist);

// Preferences
router.put('/sizes', updatePreferredSizes);

// Analytics
router.get('/analytics', getUserAnalytics);


router.get('/reviews', getUserReviews);
module.exports = router;