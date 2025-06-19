// Migration: Add OAuth fields to users collection
async function up() {
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('🔄 Adding OAuth fields to users collection...');
    
    // Add OAuth-related fields to existing users
    await db.collection('users').updateMany(
      { 
        // Only update users that don't already have OAuth fields
        oauthProviders: { $exists: false }
      },
      {
        $set: {
          oauthProviders: [], // Array of connected OAuth providers
          oauthData: {}, // OAuth profile data per provider
          lastOAuthLogin: null, // Last OAuth login date
          oauthCreated: false, // Whether user was created via OAuth
          preferredLoginMethod: 'email' // Default login method
        }
      }
    );
    
    // Create indexes for OAuth-related queries
    await db.collection('users').createIndexes([
      { key: { 'oauthData.google.id': 1 }, sparse: true },
      { key: { 'oauthData.github.id': 1 }, sparse: true },
      { key: { 'oauthData.facebook.id': 1 }, sparse: true },
      { key: { 'oauthData.twitter.id': 1 }, sparse: true },
      { key: { 'oauthData.discord.id': 1 }, sparse: true },
      { key: { 'oauthData.linkedin.id': 1 }, sparse: true },
      { key: { lastOAuthLogin: 1 }, sparse: true },
      { key: { oauthCreated: 1 } },
      { key: { oauthProviders: 1 } }
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
    
    console.log('🔄 Removing OAuth fields from users collection...');
    
    // Remove OAuth fields from users
    await db.collection('users').updateMany(
      {},
      {
        $unset: {
          oauthProviders: '',
          oauthData: '',
          lastOAuthLogin: '',
          oauthCreated: '',
          preferredLoginMethod: ''
        }
      }
    );
    
    // Drop OAuth-related indexes (ignore errors if they don't exist)
    try {
      await db.collection('users').dropIndexes([
        'oauthData.google.id_1',
        'oauthData.github.id_1',
        'oauthData.facebook.id_1',
        'oauthData.twitter.id_1',
        'oauthData.discord.id_1',
        'oauthData.linkedin.id_1',
        'lastOAuthLogin_1',
        'oauthCreated_1',
        'oauthProviders_1'
      ]);
    } catch (error) {
      console.log('⚠️  Some OAuth indexes may not exist, continuing...');
    }
    
    console.log('✅ OAuth fields removed from users collection');
  } finally {
    await client.close();
  }
}

module.exports = { up, down };