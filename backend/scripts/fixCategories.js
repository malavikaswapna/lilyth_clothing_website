// scripts/fixCategories.js
require('dotenv').config();
const mongoose = require('mongoose');
const { Category } = require('../models');

const fixCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing categories
    await Category.deleteMany({});
    console.log('🧹 Cleared existing categories');

    // Define the correct categories for Lilyth
    const categories = [
      {
        name: 'Dresses',
        slug: 'dresses',
        description: 'Elegant dresses for all occasions',
        isFeatured: true,
        sortOrder: 1
      },
      {
        name: 'Activewear',
        slug: 'activewear',
        description: 'Comfortable and stylish workout clothing',
        isFeatured: true,
        sortOrder: 2
      },
      {
        name: 'Indo-Western',
        slug: 'indo-western',
        description: 'Fusion of traditional and modern styles',
        isFeatured: true,
        sortOrder: 3
      },
      {
        name: 'Tops',
        slug: 'tops',
        description: 'Stylish tops and blouses',
        isFeatured: true,
        sortOrder: 4
      },
      {
        name: 'Bottoms',
        slug: 'bottoms',
        description: 'Pants, jeans, and skirts',
        sortOrder: 5
      },
      {
        name: 'Sleepwear',
        slug: 'sleepwear',
        description: 'Comfortable nightwear and loungewear',
        sortOrder: 6
      },
      {
        name: 'Cord Sets',
        slug: 'cord-sets',
        description: 'Coordinated outfit sets',
        sortOrder: 7
      }
    ];

    // Insert categories
    const insertedCategories = await Category.insertMany(categories);
    console.log('✅ Categories created:');
    insertedCategories.forEach(cat => {
      console.log(`  - ${cat.name} (${cat.slug})`);
    });

    console.log('🎉 Categories fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing categories:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
};

fixCategories();