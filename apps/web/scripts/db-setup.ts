// apps/web/scripts/db-setup.ts
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Direct MongoDB connection
async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  console.log('✅ Connected to MongoDB');
}

async function setupDatabase() {
  try {
    console.log('🔄 Setting up Vyral CMS database...\n');
    
    // Connect to database
    await connectDatabase();

    console.log('🔄 Creating default settings...');
    
    // Create settings directly in MongoDB
    if (!mongoose.connection.db) {
      throw new Error('MongoDB database connection is not established');
    }
    const settingsCollection = mongoose.connection.db.collection('settings');
    
    const defaultSettings = [
      {
        key: 'site_title',
        value: 'Vyral CMS',
        type: 'string',
        group: 'general',
        label: 'Site Title',
        description: 'The title of your website',
        isPublic: true,
        isAutoload: true,
        validation: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'site_description',
        value: 'A modern CMS built with Next.js',
        type: 'string',
        group: 'general',
        label: 'Site Description',
        description: 'Brief description of your website',
        isPublic: true,
        isAutoload: true,
        validation: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'site_url',
        value: 'http://localhost:3000',
        type: 'string',
        group: 'general',
        label: 'Site URL',
        description: 'The URL of your website',
        isPublic: true,
        isAutoload: true,
        validation: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'admin_email',
        value: 'admin@vyral.com',
        type: 'string',
        group: 'general',
        label: 'Admin Email',
        description: 'Primary admin email address',
        isPublic: false,
        isAutoload: true,
        validation: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'posts_per_page',
        value: 10,
        type: 'number',
        group: 'content',
        label: 'Posts Per Page',
        description: 'Number of posts to display per page',
        isPublic: false,
        isAutoload: true,
        validation: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'allow_comments',
        value: true,
        type: 'boolean',
        group: 'content',
        label: 'Allow Comments',
        description: 'Enable comments on posts',
        isPublic: false,
        isAutoload: true,
        validation: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'default_post_status',
        value: 'draft',
        type: 'string',
        group: 'content',
        label: 'Default Post Status',
        description: 'Default status for new posts',
        isPublic: false,
        isAutoload: true,
        validation: { enum: ['draft', 'published', 'private'] },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'theme',
        value: 'default',
        type: 'string',
        group: 'appearance',
        label: 'Theme',
        description: 'Active theme',
        isPublic: true,
        isAutoload: true,
        validation: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'language',
        value: 'en',
        type: 'string',
        group: 'general',
        label: 'Language',
        description: 'Site language',
        isPublic: true,
        isAutoload: true,
        validation: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'timezone',
        value: 'UTC',
        type: 'string',
        group: 'general',
        label: 'Timezone',
        description: 'Site timezone',
        isPublic: false,
        isAutoload: true,
        validation: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Insert settings (upsert to avoid duplicates)
    let settingsCreated = 0;
    for (const setting of defaultSettings) {
      const result = await settingsCollection.updateOne(
        { key: setting.key },
        { $setOnInsert: setting },
        { upsert: true }
      );
      if (result.upsertedCount > 0) {
        settingsCreated++;
        console.log(`   ✅ Created setting: ${setting.key}`);
      } else {
        console.log(`   ℹ️  Setting already exists: ${setting.key}`);
      }
    }
    
    console.log(`✅ Settings setup complete: ${settingsCreated} created\n`);

    console.log('🔄 Creating default admin user...');
    
    // Create admin user directly in MongoDB
    if (!mongoose.connection.db) {
      throw new Error('MongoDB database connection is not established');
    }
    const usersCollection = mongoose.connection.db.collection('users');
    
    // Check if admin user already exists
    const existingAdmin = await usersCollection.findOne({ email: 'admin@vyral.com' });
    
    if (!existingAdmin) {
      // Hash password
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      const adminUser = {
        username: 'admin',
        email: 'admin@vyral.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        displayName: 'Administrator',
        role: 'admin',
        status: 'active',
        emailVerified: true,
        emailVerifiedAt: new Date(),
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
        loginCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await usersCollection.insertOne(adminUser);
      
      if (result.insertedId) {
        console.log('✅ Default admin user created successfully!');
        console.log('   📧 Email: admin@vyral.com');
        console.log('   🔑 Password: admin123');
        console.log('   ⚠️  IMPORTANT: Change this password after first login!\n');
      } else {
        throw new Error('Failed to create admin user');
      }
    } else {
      console.log('ℹ️  Admin user already exists\n');
    }

    // Verify data was created
    console.log('🔍 Verifying database setup...');
    
    const settingsCount = await settingsCollection.countDocuments();
    const usersCount = await usersCollection.countDocuments();
    
    console.log(`   📊 Settings in database: ${settingsCount}`);
    console.log(`   👥 Users in database: ${usersCount}`);
    
    if (settingsCount === 0 || usersCount === 0) {
      throw new Error('Database setup verification failed - no documents found');
    }

    console.log('\n🎉 Database setup completed successfully!');
    console.log('   🌐 Your site is ready for development');
    console.log('   📁 Run "npm run db:seed" to add sample content');
    console.log('   🚀 Run "npm run dev" to start the development server');
    
  } catch (error) {
    console.error('\n❌ Database setup failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default setupDatabase;