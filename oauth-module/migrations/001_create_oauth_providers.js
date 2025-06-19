// Migration: Create OAuth providers collection
async function up() {
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('🔄 Creating oauth_providers collection...');
    
    // Create oauth_providers collection
    await db.createCollection('oauth_providers', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name', 'slug'],
          properties: {
            name: { bsonType: 'string' },
            slug: { bsonType: 'string' },
            clientId: { bsonType: 'string' },
            clientSecret: { bsonType: 'string' },
            scopes: { bsonType: 'array' },
            enabled: { bsonType: 'bool' },
            config: { bsonType: 'object' },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' }
          }
        }
      }
    });
    
    // Create indexes
    await db.collection('oauth_providers').createIndexes([
      { key: { slug: 1 }, unique: true },
      { key: { enabled: 1 } },
      { key: { createdAt: 1 } }
    ]);
    
    console.log('✅ OAuth providers collection created');
  } finally {
    await client.close();
  }
}

async function down() {
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('🔄 Dropping oauth_providers collection...');
    await db.collection('oauth_providers').drop();
    console.log('✅ OAuth providers collection dropped');
  } finally {
    await client.close();
  }
}

module.exports = { up, down };