require('dotenv').config();
const mongoose = require('mongoose');
const { User, Product, Category, Order, Review, Cart } = require('../models');

const cleanup = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Clear all collections individually
    console.log('🧹 Clearing collections...');
    await User.deleteMany({});
    console.log('- Users cleared');
    
    await Product.deleteMany({});
    console.log('- Products cleared');
    
    await Category.deleteMany({});
    console.log('- Categories cleared');
    
    await Order.deleteMany({});
    console.log('- Orders cleared');
    
    await Review.deleteMany({});
    console.log('- Reviews cleared');
    
    await Cart.deleteMany({});
    console.log('- Carts cleared');
    
    console.log('✅ All collections cleared successfully');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
};

cleanup();