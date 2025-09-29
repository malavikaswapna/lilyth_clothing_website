// routes/contact.js
const express = require('express');
const { submitContactForm, getContactStats } = require('../controllers/contactController');
const { protect, authorize } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for contact form
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 contact form submissions per windowMs
  message: {
    success: false,
    message: 'Too many contact form submissions. Please try again in 15 minutes.'
  }
});

// Public route
router.post('/', contactLimiter, submitContactForm);

// Admin route
router.get('/stats', protect, authorize('admin'), getContactStats);

module.exports = router;