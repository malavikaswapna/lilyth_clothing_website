require('dotenv').config();
const mongoose = require('mongoose');

const dropBadIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('📂 Available collections:', collections.map(c => c.name));
    
    // Try to drop the bad index from users collection
    if (collections.some(c => c.name === 'users')) {
      const usersCollection = db.collection('users');
      
      console.log('🔍 Current indexes on users:');
      const indexes = await usersCollection.indexes();
      indexes.forEach(index => console.log(`  - ${JSON.stringify(index.key)}`));
      
      // Drop any SKU related indexes
      const indexesToDrop = ['sku_1', 'sku'];
      
      for (const indexName of indexesToDrop) {
        try {
          await usersCollection.dropIndex(indexName);
          console.log(`✅ Dropped index: ${indexName}`);
        } catch (error) {
          console.log(`ℹ️  Index ${indexName} not found (this is fine)`);
        }
      }
      
      console.log('🔍 Final indexes on users:');
      const finalIndexes = await usersCollection.indexes();
      finalIndexes.forEach(index => console.log(`  - ${JSON.stringify(index.key)}`));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
};

dropBadIndex();