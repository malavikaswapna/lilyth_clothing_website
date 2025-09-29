// routes/orders.js
const express = require('express');
const {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  updateTracking,
  cancelOrder,
  getAllOrders,
  createPaymentOrder,      
  verifyPayment,           
  handlePaymentFailure,    
  razorpayWebhook 
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// webhook route
router.post('/webhook', razorpayWebhook);

router.use(protect);

// Customer routes
router.post('/', createOrder);
router.get('/', getMyOrders);
router.get('/:id', getOrder);
router.put('/:id/cancel', cancelOrder);
router.post('/create-payment', createPaymentOrder);
router.post('/verify-payment', verifyPayment);
router.post('/payment-failed', handlePaymentFailure);

// Admin routes
router.get('/admin/all', authorize('admin'), getAllOrders);
router.put('/:id/status', authorize('admin'), updateOrderStatus);
router.put('/:id/tracking', authorize('admin'), updateTracking);

module.exports = router;