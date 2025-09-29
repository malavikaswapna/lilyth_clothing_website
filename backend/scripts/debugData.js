require('dotenv').config();
const mongoose = require('mongoose');
const { Product, Category } = require('../models');

const debugData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check categories
    const categories = await Category.find();
    console.log('\n📂 Categories in database:');
    categories.forEach(cat => {
      console.log(`- ${cat.name} (slug: ${cat.slug}, id: ${cat._id})`);
    });

    // Check products
    const products = await Product.find().populate('category');
    console.log('\n👗 Products in database:');
    products.forEach(product => {
      console.log(`- ${product.name}`);
      console.log(`  Category: ${product.category?.name || 'None'}`);
      console.log(`  Status: ${product.status}`);
      console.log(`  Featured: ${product.isFeatured}`);
      console.log(`  New Arrival: ${product.isNewArrival}`);
      console.log(`  Total Stock: ${product.totalStock}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

debugData();