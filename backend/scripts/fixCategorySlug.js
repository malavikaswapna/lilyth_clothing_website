require('dotenv').config();
const mongoose = require('mongoose');
const { Category } = require('../models');

const fixCategorySlugs = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const categories = await Category.find();
    
    for (const category of categories) {
      if (!category.slug) {
        category.slug = category.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        
        await category.save();
        console.log(`Fixed slug for ${category.name}: ${category.slug}`);
      }
    }

    console.log('All category slugs fixed!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

fixCategorySlugs();