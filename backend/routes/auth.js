// routes/auth.js
const express = require('express');
const {
  register,
  login,
  getMe,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
  googleAuth,
  verifyEmail,             
  resendVerificationEmail
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);
router.post('/google', googleAuth);

// Email verification routes
router.get('/verify-email/:token', verifyEmail);  
router.post('/resend-verification', protect, resendVerificationEmail);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, updatePassword);

module.exports = router;