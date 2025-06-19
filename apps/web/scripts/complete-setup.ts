// apps/web/scripts/complete-setup.ts
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

function loadEnvironment() {
  // Try different possible locations for .env.local
  const possiblePaths = [
    path.join(process.cwd(), '.env.local'),
    path.join(__dirname, '..', '.env.local'),
    path.join(__dirname, '..', '..', '.env.local'),
  ];

  let envLoaded = false;
  let envPath = '';

  console.log('🔍 Searching for .env.local file...');
  
  for (const envFilePath of possiblePaths) {
    console.log(`   Checking: ${envFilePath}`);
    if (fs.existsSync(envFilePath)) {
      console.log(`   ✅ Found .env.local at: ${envFilePath}`);
      config({ path: envFilePath });
      envLoaded = true;
      envPath = envFilePath;
      break;
    } else {
      console.log(`   ❌ Not found at: ${envFilePath}`);
    }
  }

  if (!envLoaded) {
    console.log('\n❌ Could not find .env.local file in any expected location');
    console.log('\n🔧 To fix this:');
    console.log('1. Make sure you\'re in the apps/web directory');
    console.log('2. Create .env.local file with:');
    console.log('   MONGODB_URI=mongodb://localhost:27017/vyral_cms');
    console.log('   NEXTAUTH_SECRET=your-secret-here');
    console.log('   JWT_SECRET=your-jwt-secret-here');
    console.log('   NEXTAUTH_URL=http://localhost:3000');
    throw new Error('Could not find .env.local file');
  }

  // Verify critical environment variables
  const requiredVars = ['MONGODB_URI', 'NEXTAUTH_SECRET', 'JWT_SECRET'];
  const missingVars: string[] = [];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      missingVars.push(varName);
    } else {
      console.log(`   ✅ ${varName}: ${value.length > 20 ? value.substring(0, 20) + '...' : value}`);
    }
  }

  if (missingVars.length > 0) {
    console.log(`\n❌ Missing environment variables in ${envPath}:`);
    missingVars.forEach(v => console.log(`   • ${v}`));
    
    console.log('\n🔧 Your .env.local should contain:');
    console.log('MONGODB_URI=mongodb://localhost:27017/vyral_cms');
    console.log('NEXTAUTH_SECRET=your-secret-here');
    console.log('JWT_SECRET=your-jwt-secret-here');
    console.log('NEXTAUTH_URL=http://localhost:3000');
    
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  console.log(`✅ Environment variables loaded successfully from: ${envPath}`);
  return true;
}
// Direct MongoDB connection
async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  console.log('🔗 Connecting to MongoDB...');
  console.log(`   📍 URI: ${uri.replace(/\/\/.*@/, '//***@')}`);
  
  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  console.log('✅ Connected to MongoDB successfully');
}

async function completeSetup() {
  try {
    console.log('🚀 Starting complete Vyral CMS setup...\n');
    
    // Load environment variables first
    console.log('🔍 Loading environment variables...');
    loadEnvironment();
    console.log('');
    
    // Pre-flight checks
    console.log('🔍 Running pre-flight checks...');
    
    // Check if we're in the right directory
    const currentDir = process.cwd();
    console.log(`   📁 Current directory: ${currentDir}`);
    
    // Check for package.json to confirm we're in the right place
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.log('❌ package.json not found in current directory');
      console.log('Please run this script from the apps/web directory');
      process.exit(1);
    }
    
    // Check required environment variables are actually loaded
    const requiredEnvVars = ['MONGODB_URI', 'NEXTAUTH_SECRET', 'JWT_SECRET'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        console.log(`❌ Environment variable ${envVar} is still not loaded`);
        process.exit(1);
      }
    }
    console.log('✅ Environment checks passed\n');
    
    // Connect to database
    await connectDatabase();
    
    // Clear existing data check
    console.log('🧹 Checking for existing data...');
    const collections = ['users', 'settings', 'posts', 'categories', 'tags'];
    const existingData = {};

    if (!mongoose.connection.db) {
      throw new Error('MongoDB connection is not established. "mongoose.connection.db" is undefined.');
    }
    
    for (const collectionName of collections) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);
        const count = await collection.countDocuments();
        existingData[collectionName] = count;
        console.log(`   ${collectionName}: ${count} documents`);
      } catch (error) {
        console.log(`   ${collectionName}: Error checking collection - ${error}`);
        existingData[collectionName] = 0;
      }
    }
    
    const hasExistingData = (Object.values(existingData) as number[]).some((count) => count > 0);
    
    if (hasExistingData) {
      console.log('\nℹ️  Existing data found. This script will only add missing data.\n');
    } else {
      console.log('\n✨ Fresh database detected. Setting up everything...\n');
    }
    
    // === STEP 1: CREATE SETTINGS ===
    console.log('⚙️  Step 1: Creating default settings...');
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
        isAutoload: true
      },
      {
        key: 'site_description',
        value: 'A modern CMS built with Next.js',
        type: 'string',
        group: 'general',
        label: 'Site Description',
        description: 'Brief description of your website',
        isPublic: true,
        isAutoload: true
      },
      {
        key: 'site_url',
        value: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        type: 'string',
        group: 'general',
        label: 'Site URL',
        description: 'The URL of your website',
        isPublic: true,
        isAutoload: true
      },
      {
        key: 'admin_email',
        value: 'admin@vyral.com',
        type: 'string',
        group: 'general',
        label: 'Admin Email',
        description: 'Primary admin email address',
        isPublic: false,
        isAutoload: true
      },
      {
        key: 'posts_per_page',
        value: 10,
        type: 'number',
        group: 'content',
        label: 'Posts Per Page',
        description: 'Number of posts to display per page',
        isPublic: false,
        isAutoload: true
      },
      {
        key: 'allow_comments',
        value: true,
        type: 'boolean',
        group: 'content',
        label: 'Allow Comments',
        description: 'Enable comments on posts',
        isPublic: false,
        isAutoload: true
      },
      {
        key: 'comment_moderation',
        value: true,
        type: 'boolean',
        group: 'content',
        label: 'Comment Moderation',
        description: 'Require admin approval for comments',
        isPublic: false,
        isAutoload: true
      },
      {
        key: 'default_post_status',
        value: 'draft',
        type: 'string',
        group: 'content',
        label: 'Default Post Status',
        description: 'Default status for new posts',
        isPublic: false,
        isAutoload: true
      },
      {
        key: 'enable_registration',
        value: false,
        type: 'boolean',
        group: 'users',
        label: 'Enable Registration',
        description: 'Allow new user registration',
        isPublic: false,
        isAutoload: true
      },
      {
        key: 'theme',
        value: 'default',
        type: 'string',
        group: 'appearance',
        label: 'Theme',
        description: 'Active theme',
        isPublic: true,
        isAutoload: true
      },
      {
        key: 'language',
        value: 'en',
        type: 'string',
        group: 'general',
        label: 'Language',
        description: 'Site language',
        isPublic: true,
        isAutoload: true
      },
      {
        key: 'timezone',
        value: 'UTC',
        type: 'string',
        group: 'general',
        label: 'Timezone',
        description: 'Site timezone',
        isPublic: false,
        isAutoload: true
      },
      {
        key: 'maintenance_mode',
        value: false,
        type: 'boolean',
        group: 'system',
        label: 'Maintenance Mode',
        description: 'Enable maintenance mode',
        isPublic: false,
        isAutoload: true
      },
      {
        key: 'seo_title',
        value: 'Vyral CMS - Modern Content Management',
        type: 'string',
        group: 'seo',
        label: 'SEO Title',
        description: 'Default SEO title',
        isPublic: true,
        isAutoload: true
      },
      {
        key: 'seo_description',
        value: 'A modern, fast, and flexible content management system built with Next.js and MongoDB.',
        type: 'string',
        group: 'seo',
        label: 'SEO Description',
        description: 'Default SEO description',
        isPublic: true,
        isAutoload: true
      }
    ];

    let settingsCreated = 0;
    for (const setting of defaultSettings) {
      try {
        const settingData = {
          ...setting,
          validation: {},
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await settingsCollection.updateOne(
          { key: setting.key },
          { $setOnInsert: settingData },
          { upsert: true }
        );
        
        if (result.upsertedCount > 0) {
          settingsCreated++;
          console.log(`   ✅ Created setting: ${setting.key}`);
        } else {
          console.log(`   ℹ️  Setting already exists: ${setting.key}`);
        }
      } catch (error) {
        console.log(`   ❌ Failed to create setting ${setting.key}: ${error}`);
      }
    }
    console.log(`✅ Settings complete: ${settingsCreated} new settings created\n`);

    // === STEP 2: CREATE ADMIN USER ===
    console.log('👤 Step 2: Creating admin user...');
    if (!mongoose.connection.db) {
      throw new Error('MongoDB connection is not established. "mongoose.connection.db" is undefined.');
    }
    const usersCollection = mongoose.connection.db.collection('users');
    
    const existingAdmin = await usersCollection.findOne({ email: 'admin@vyral.com' });
    
    if (!existingAdmin) {
      try {
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
          console.log('✅ Admin user created successfully');
          console.log('   📧 Email: admin@vyral.com');
          console.log('   🔑 Password: admin123');
          console.log(`   🆔 ID: ${result.insertedId}`);
        } else {
          console.log('❌ Failed to create admin user');
        }
      } catch (error) {
        console.log(`❌ Error creating admin user: ${error}`);
      }
    } else {
      console.log('ℹ️  Admin user already exists');
      console.log(`   🆔 ID: ${existingAdmin._id}`);
    }
    console.log('');

    // === STEP 3: CREATE CATEGORIES ===
    console.log('📂 Step 3: Creating categories...');
    const categoriesCollection = mongoose.connection.db.collection('categories');
    
    const categories = [
      {
        name: 'Technology',
        slug: 'technology',
        description: 'All about technology trends and innovations',
        color: '#3b82f6'
      },
      {
        name: 'Business',
        slug: 'business',
        description: 'Business insights and strategies',
        color: '#10b981'
      },
      {
        name: 'Lifestyle',
        slug: 'lifestyle',
        description: 'Lifestyle tips and trends',
        color: '#f59e0b'
      },
      {
        name: 'Tutorials',
        slug: 'tutorials',
        description: 'Step-by-step guides and tutorials',
        color: '#8b5cf6'
      }
    ];

    const categoryIds = {};
    let categoriesCreated = 0;
    
    for (const category of categories) {
      try {
        const categoryData = {
          ...category,
          postCount: 0,
          seo: {
            title: `${category.name} Articles`,
            description: category.description,
            keywords: [category.slug],
            noindex: false
          },
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await categoriesCollection.updateOne(
          { slug: category.slug },
          { $setOnInsert: { ...categoryData, _id: new mongoose.Types.ObjectId() } },
          { upsert: true }
        );
        
        if (result.upsertedCount > 0) {
          categoriesCreated++;
          categoryIds[category.slug] = result.upsertedId;
          console.log(`   ✅ Created category: ${category.name} (ID: ${result.upsertedId})`);
        } else {
          const existing = await categoriesCollection.findOne({ slug: category.slug });
          categoryIds[category.slug] = existing?._id;
          console.log(`   ℹ️  Category already exists: ${category.name} (ID: ${existing?._id})`);
        }
      } catch (error) {
        console.log(`   ❌ Failed to create category ${category.name}: ${error}`);
      }
    }
    console.log(`✅ Categories complete: ${categoriesCreated} new categories created\n`);

    // === STEP 4: CREATE TAGS ===
    console.log('🏷️  Step 4: Creating tags...');
    const tagsCollection = mongoose.connection.db.collection('tags');
    
    const tags = [
      { name: 'Getting Started', slug: 'getting-started' },
      { name: 'Tutorial', slug: 'tutorial' },
      { name: 'Guide', slug: 'guide' },
      { name: 'CMS', slug: 'cms' },
      { name: 'Next.js', slug: 'nextjs' },
      { name: 'Web Development', slug: 'web-development' }
    ];

    let tagsCreated = 0;
    
    for (const tag of tags) {
      try {
        const tagData = {
          ...tag,
          description: `Content related to ${tag.name}`,
          color: '#6b7280',
          postCount: 0,
          seo: {
            title: `${tag.name} Articles`,
            description: `All articles tagged with ${tag.name}`,
            keywords: [tag.slug],
            noindex: false
          },
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await tagsCollection.updateOne(
          { slug: tag.slug },
          { $setOnInsert: tagData },
          { upsert: true }
        );
        
        if (result.upsertedCount > 0) {
          tagsCreated++;
          console.log(`   ✅ Created tag: ${tag.name}`);
        } else {
          console.log(`   ℹ️  Tag already exists: ${tag.name}`);
        }
      } catch (error) {
        console.log(`   ❌ Failed to create tag ${tag.name}: ${error}`);
      }
    }
    console.log(`✅ Tags complete: ${tagsCreated} new tags created\n`);

    // === STEP 5: CREATE SAMPLE POSTS ===
    console.log('📝 Step 5: Creating sample posts...');
    const postsCollection = mongoose.connection.db.collection('posts');
    
    const posts = [
      {
        title: 'Welcome to Vyral CMS',
        slug: 'welcome-to-vyral-cms',
        content: `<h1>Welcome to Vyral CMS!</h1><p>Congratulations on successfully setting up your new Vyral CMS installation! This modern content management system is built with Next.js and MongoDB to provide you with a fast, flexible, and powerful platform for managing your website content.</p><h2>Getting Started</h2><p>Here are some things you can do to get started:</p><ul><li>Visit the admin dashboard at <code>/admin</code></li><li>Create new posts and pages</li><li>Customize your site settings</li><li>Explore the plugin system</li><li>Change your theme</li></ul><p>The default admin credentials are:</p><ul><li><strong>Email:</strong> admin@vyral.com</li><li><strong>Password:</strong> admin123</li></ul><p><strong>Important:</strong> Please change these credentials after your first login!</p><h2>Features</h2><p>Vyral CMS includes many powerful features:</p><ul><li>Modern Next.js 13+ with App Router</li><li>Rich text editor with TipTap</li><li>SEO optimization</li><li>Plugin system for extensibility</li><li>Responsive design</li><li>Dark/light mode support</li></ul><p>Happy publishing!</p>`,
        excerpt: 'Welcome to your new Vyral CMS installation! Learn how to get started with this powerful content management system.',
        status: 'published',
        type: 'post',
        categoryId: categoryIds['tutorials'],
        tags: ['getting-started', 'cms', 'tutorial'],
        publishedAt: new Date()
      },
      {
        title: 'Getting Started with Content Creation',
        slug: 'getting-started-with-content-creation',
        content: `<h1>Getting Started with Content Creation</h1><p>Creating compelling content is at the heart of any successful website. This guide will walk you through the content creation process in Vyral CMS.</p><h2>Creating Your First Post</h2><p>To create a new post:</p><ol><li>Navigate to the admin dashboard</li><li>Click on "Posts" in the sidebar</li><li>Click the "New Post" button</li><li>Fill in your title and content</li><li>Choose a category and add tags</li><li>Publish when ready</li></ol><h2>Using the Rich Text Editor</h2><p>The built-in editor supports:</p><ul><li>Rich text formatting (bold, italic, etc.)</li><li>Headings and lists</li><li>Links and images</li><li>Code blocks</li><li>Custom styling</li></ul><h2>SEO Optimization</h2><p>Don't forget to optimize your content for search engines by:</p><ul><li>Writing compelling titles and descriptions</li><li>Adding relevant keywords naturally</li><li>Using proper heading structure</li><li>Adding alt text to images</li></ul><p>With these basics, you're ready to start creating amazing content!</p>`,
        excerpt: 'Learn the fundamentals of creating and managing content with Vyral CMS\'s powerful editor and publishing tools.',
        status: 'published',
        type: 'post',
        categoryId: categoryIds['tutorials'],
        tags: ['guide', 'cms'],
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    ];

    let postsCreated = 0;
    
    for (const post of posts) {
      try {
        const postData = {
          ...post,
          featuredImage: null,
          seo: {
            title: post.title,
            description: post.excerpt,
            keywords: post.tags,
            canonical: '',
            noindex: false
          },
          metadata: {
            readingTime: Math.ceil(post.content.split(' ').length / 200),
            wordCount: post.content.split(' ').length
          },
          createdAt: post.publishedAt,
          updatedAt: post.publishedAt
        };

        const result = await postsCollection.updateOne(
          { slug: post.slug },
          { $setOnInsert: postData },
          { upsert: true }
        );
        
        if (result.upsertedCount > 0) {
          postsCreated++;
          console.log(`   ✅ Created post: ${post.title}`);
        } else {
          console.log(`   ℹ️  Post already exists: ${post.title}`);
        }
      } catch (error) {
        console.log(`   ❌ Failed to create post ${post.title}: ${error}`);
      }
    }
    console.log(`✅ Posts complete: ${postsCreated} new posts created\n`);

    // === FINAL VERIFICATION ===
    console.log('🔍 Final verification...');
    
    const finalCounts = {
      users: await usersCollection.countDocuments(),
      settings: await settingsCollection.countDocuments(),
      categories: await categoriesCollection.countDocuments(),
      tags: await tagsCollection.countDocuments(),
      posts: await postsCollection.countDocuments()
    };

    console.log('📊 Final database contents:');
    Object.entries(finalCounts).forEach(([collection, count]) => {
      console.log(`   ${collection}: ${count} documents`);
    });

    // Verify we actually have data
    const totalDocuments = Object.values(finalCounts).reduce((sum, count) => sum + count, 0);
    
    if (totalDocuments === 0) {
      throw new Error('Setup completed but no documents were created! Check your MongoDB connection and permissions.');
    }

    // Test a few sample documents
    console.log('\n📋 Sample data verification:');
    
    const sampleUser = await usersCollection.findOne({ email: 'admin@vyral.com' });
    if (sampleUser) {
      console.log(`   👤 Admin user: ${sampleUser.email} (${sampleUser.role})`);
    }
    
    const sampleSetting = await settingsCollection.findOne({ key: 'site_title' });
    if (sampleSetting) {
      console.log(`   ⚙️  Site title: ${sampleSetting.value}`);
    }
    
    const sampleCategory = await categoriesCollection.findOne();
    if (sampleCategory) {
      console.log(`   📂 Sample category: ${sampleCategory.name}`);
    }

    // Success message
    console.log('\n🎉 Setup completed successfully!');
    console.log('');
    console.log('🌐 Your Vyral CMS is ready:');
    console.log('   • Website: http://localhost:3000');
    console.log('   • Admin: http://localhost:3000/admin');
    console.log('   • Email: admin@vyral.com');
    console.log('   • Password: admin123');
    console.log('');
    console.log('🚀 Next steps:');
    console.log('   • Start development server: npm run dev');
    console.log('   • Change admin password after first login');
    console.log('   • Customize your site settings');
    console.log('   • Create your first custom content');
    console.log('');
    console.log('⚠️  Security reminder: Change the default admin password immediately!');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    
    if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string' && (error as any).message.includes('MONGODB_URI')) {
      console.log('\n🔧 Environment variable issue:');
      console.log('1. Make sure .env.local exists in the current directory');
      console.log('2. Ensure it contains: MONGODB_URI=mongodb://localhost:27017/vyral_cms');
      console.log('3. Run the script from the apps/web directory');
    }
    
    throw error;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Run if called directly
if (require.main === module) {
  completeSetup()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default completeSetup;