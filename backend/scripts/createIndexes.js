require('dotenv').config();
const mongoose = require('mongoose');

const createIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Products Collection Indexes
    await db.collection('products').createIndexes([
      { key: { slug: 1 }, name: 'slug_1', unique: true },
      { key: { category: 1, status: 1 }, name: 'category_status_1' },
      { key: { brand: 1 }, name: 'brand_1' },
      { key: { price: 1 }, name: 'price_1' },
      { key: { 'variants.size': 1, 'variants.color.name': 1 }, name: 'variants_1' },
      { key: { averageRating: -1 }, name: 'rating_desc_1' },
      { key: { createdAt: -1 }, name: 'created_desc_1' },
      { key: { isFeatured: 1, status: 1 }, name: 'featured_status_1' },
      { key: { isNewArrival: 1, status: 1 }, name: 'new_status_1' },
      { key: { tags: 1 }, name: 'tags_1' }
    ]);
    console.log('✅ Products indexes created');

    // Users Collection Indexes
    await db.collection('users').createIndexes([
      { key: { email: 1 }, name: 'email_1', unique: true },
      { key: { 'addresses.postalCode': 1 }, name: 'address_postal_1' }
    ]);
    console.log('✅ Users indexes created');

    // Orders Collection Indexes
    await db.collection('orders').createIndexes([
      { key: { user: 1, createdAt: -1 }, name: 'user_created_1' },
      { key: { orderNumber: 1 }, name: 'order_number_1', unique: true },
      { key: { status: 1 }, name: 'status_1' },
      { key: { 'payment.status': 1 }, name: 'payment_status_1' },
      { key: { createdAt: -1 }, name: 'created_desc_1' }
    ]);
    console.log('✅ Orders indexes created');

    // Categories Collection Indexes
    await db.collection('categories').createIndexes([
      { key: { slug: 1 }, name: 'slug_1', unique: true },
      { key: { parent: 1, sortOrder: 1 }, name: 'parent_sort_1' },
      { key: { isActive: 1, isFeatured: 1 }, name: 'active_featured_1' }
    ]);
    console.log('✅ Categories indexes created');

    // Carts Collection Indexes
    await db.collection('carts').createIndexes([
      { key: { user: 1 }, name: 'user_1', unique: true },
      { key: { 'items.product': 1 }, name: 'items_product_1' }
    ]);
    console.log('✅ Carts indexes created');

    console.log('🎉 All indexes created successfully');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
};

createIndexes();