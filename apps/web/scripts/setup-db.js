const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Create collections with indexes
    console.log('Creating collections and indexes...');
    
    // Posts collection
    await db.createCollection('posts');
    await db.collection('posts').createIndex({ slug: 1 }, { unique: true });
    await db.collection('posts').createIndex({ status: 1, publishedAt: -1 });
    await db.collection('posts').createIndex({ type: 1, status: 1 });
    await db.collection('posts').createIndex({ author: 1 });
    await db.collection('posts').createIndex({ categories: 1 });
    await db.collection('posts').createIndex({ tags: 1 });
    await db.collection('posts').createIndex({ 
      title: 'text', 
      content: 'text', 
      excerpt: 'text' 
    });
    
    // Categories collection
    await db.createCollection('categories');
    await db.collection('categories').createIndex({ slug: 1 }, { unique: true });
    await db.collection('categories').createIndex({ parent: 1 });
    await db.collection('categories').createIndex({ name: 'text', description: 'text' });
    
    // Tags collection
    await db.createCollection('tags');
    await db.collection('tags').createIndex({ slug: 1 }, { unique: true });
    await db.collection('tags').createIndex({ name: 'text', description: 'text' });
    
    // Users collection
    await db.createCollection('users');
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ status: 1 });
    
    // Media collection
    await db.createCollection('media');
    await db.collection('media').createIndex({ filename: 1 });
    await db.collection('media').createIndex({ uploadedBy: 1 });
    await db.collection('media').createIndex({ mimeType: 1 });
    await db.collection('media').createIndex({ tags: 1 });
    await db.collection('media').createIndex({ 
      title: 'text', 
      alt: 'text', 
      description: 'text' 
    });
    
    // Comments collection
    await db.createCollection('comments');
    await db.collection('comments').createIndex({ postId: 1 });
    await db.collection('comments').createIndex({ status: 1 });
    await db.collection('comments').createIndex({ parentId: 1 });
    
    // Settings collection
    await db.createCollection('settings');
    await db.collection('settings').createIndex({ key: 1 }, { unique: true });
    await db.collection('settings').createIndex({ group: 1 });
    await db.collection('settings').createIndex({ isAutoload: 1 });
    
    // Navigation collection
    await db.createCollection('navigations');
    await db.collection('navigations').createIndex({ slug: 1 }, { unique: true });
    await db.collection('navigations').createIndex({ location: 1 });
    
    // Activity collection
    await db.createCollection('activities');
    await db.collection('activities').createIndex({ userId: 1 });
    await db.collection('activities').createIndex({ resourceType: 1, resourceId: 1 });
    await db.collection('activities').createIndex({ createdAt: -1 });
    
    // Plugin/Theme collections
    await db.createCollection('plugins');
    await db.collection('plugins').createIndex({ name: 1 }, { unique: true });
    await db.collection('plugins').createIndex({ status: 1 });
    
    await db.createCollection('themes');
    await db.collection('themes').createIndex({ name: 1 }, { unique: true });
    await db.collection('themes').createIndex({ status: 1 });
    
    console.log('Database setup completed successfully!');
    
    // Create default admin user if none exists
    const userCount = await db.collection('users').countDocuments();
    if (userCount === 0) {
      console.log('Creating default admin user...');
      
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      await db.collection('users').insertOne({
        username: 'admin',
        email: 'admin@vyral.com',
        password: hashedPassword,
        displayName: 'Administrator',
        role: 'super_admin',
        status: 'active',
        emailVerified: true,
        loginCount: 0,
        permissions: [],
        preferences: {
          language: 'en',
          timezone: 'UTC',
          theme: 'system',
          emailNotifications: {
            comments: true,
            posts: true,
            system: true,
            marketing: false
          },
          privacy: {
            showEmail: false,
            showProfile: true,
            allowMessages: true
          }
        },
        social: {},
        metadata: {},
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('Default admin user created:');
      console.log('Email: admin@vyral.com');
      console.log('Password: admin123');
      console.log('Please change this password after first login!');
    }
    
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required');
  process.exit(1);
}

setupDatabase().catch(console.error);
