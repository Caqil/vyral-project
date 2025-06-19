// Migration: Create OAuth tokens collection
async function up() {
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Create oauth_tokens collection
    await db.createCollection('oauth_tokens', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'provider', 'accessToken'],
          properties: {
            userId: { bsonType: 'objectId' },
            provider: { bsonType: 'string' },
            providerId: { bsonType: 'string' },
            accessToken: { bsonType: 'string' },
            refreshToken: { bsonType: 'string' },
            expiresAt: { bsonType: 'date' },
            scopes: { bsonType: 'array' },
            profile: { bsonType: 'object' }
          }
        }
      }
    });
    
    // Create indexes
    await db.collection('oauth_tokens').createIndexes([
      { key: { userId: 1, provider: 1 }, unique: true },
      { key: { provider: 1 } },
      { key: { expiresAt: 1 } },
      { key: { providerId: 1 } }
    ]);
    
    console.log('✅ OAuth tokens collection created');
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
    await db.collection('oauth_tokens').drop();
    console.log('✅ OAuth tokens collection dropped');
  } finally {
    await client.close();
  }
}

module.exports = { up, down };