// Migration: Add OAuth fields to users collection
async function up() {
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Add OAuth fields to existing users
    await db.collection('users').updateMany(
      {},
      {
        $set: {
          oauthProviders: [],
          oauthData: {},
          createdVia: 'manual'
        }
      }
    );
    
    // Create indexes for OAuth fields
    await db.collection('users').createIndexes([
      { key: { 'oauthData.google.id': 1 }, sparse: true },
      { key: { 'oauthData.github.id': 1 }, sparse: true },
      { key: { 'oauthData.facebook.id': 1 }, sparse: true },
      { key: { 'oauthData.twitter.id': 1 }, sparse: true },
      { key: { 'oauthData.discord.id': 1 }, sparse: true },
      { key: { 'oauthData.linkedin.id': 1 }, sparse: true }
    ]);
    
    console.log('✅ OAuth fields added to users collection');
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
    
    // Remove OAuth fields from users
    await db.collection('users').updateMany(
      {},
      {
        $unset: {
          oauthProviders: '',
          oauthData: '',
          createdVia: ''
        }
      }
    );
    
    console.log('✅ OAuth fields removed from users collection');
  } finally {
    await client.close();
  }
}

module.exports = { up, down };