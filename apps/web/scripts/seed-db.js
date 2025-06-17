const { MongoClient } = require('mongodb');

const samplePosts = [
  {
    title: 'Welcome to Vyral CMS',
    slug: 'welcome-to-vyral-cms',
    content: `
      <h2>Welcome to Vyral CMS!</h2>
      <p>Vyral CMS is a modern, plugin-based content management system built with Next.js, TypeScript, and MongoDB. This is your first blog post - you can edit or delete it, and start writing your own content!</p>
      
      <h3>Key Features</h3>
      <ul>
        <li><strong>Modern Stack:</strong> Built with Next.js 13+, TypeScript, and MongoDB</li>
        <li><strong>Plugin System:</strong> Extend functionality with custom plugins</li>
        <li><strong>Theme Support:</strong> Customize the look and feel with themes</li>
        <li><strong>Rich Editor:</strong> Beautiful WYSIWYG editor for content creation</li>
        <li><strong>SEO Optimized:</strong> Built-in SEO features and optimization</li>
        <li><strong>Admin Dashboard:</strong> Comprehensive admin interface</li>
      </ul>
      
      <h3>Getting Started</h3>
      <p>To get started with Vyral CMS:</p>
      <ol>
        <li>Log in to the admin dashboard</li>
        <li>Create your first category</li>
        <li>Write and publish your content</li>
        <li>Customize your site settings</li>
        <li>Install plugins to extend functionality</li>
      </ol>
      
      <p>Happy blogging with Vyral CMS!</p>
    `,
    excerpt: 'Welcome to Vyral CMS! This modern content management system helps you create amazing content experiences.',
    status: 'published',
    type: 'post',
    publishedAt: new Date(),
    commentStatus: 'open',
    pingStatus: 'open',
    sticky: true,
    seo: {
      title: 'Welcome to Vyral CMS - Getting Started Guide',
      description: 'Learn how to get started with Vyral CMS, a modern content management system built with Next.js.',
      keywords: ['vyral', 'cms', 'getting started', 'next.js'],
      noindex: false,
      nofollow: false
    },
    metadata: {},
    viewCount: 0,
    likeCount: 0,
    shareCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: 'Building Your First Plugin',
    slug: 'building-your-first-plugin',
    content: `
      <h2>Building Your First Vyral CMS Plugin</h2>
      <p>One of the most powerful features of Vyral CMS is its extensible plugin system. In this guide, we'll walk through creating your first plugin.</p>
      
      <h3>Plugin Structure</h3>
      <p>Every Vyral plugin consists of:</p>
      <ul>
        <li>A <code>plugin.config.json</code> file with metadata</li>
        <li>Main plugin file extending BasePlugin</li>
        <li>Optional components, API routes, and assets</li>
      </ul>
      
      <h3>Basic Plugin Example</h3>
      <pre><code>// plugin.config.json
{
  "name": "hello-world",
  "version": "1.0.0",
  "description": "A simple hello world plugin",
  "author": "Your Name",
  "vyralVersion": "^1.0.0"
}</code></pre>
      
      <p>Plugins can hook into various parts of the system, add admin pages, and extend functionality seamlessly.</p>
    `,
    excerpt: 'Learn how to build your first plugin for Vyral CMS and extend its functionality.',
    status: 'published',
    type: 'post',
    publishedAt: new Date(Date.now() - 86400000), // 1 day ago
    commentStatus: 'open',
    pingStatus: 'open',
    seo: {
      title: 'Building Your First Vyral CMS Plugin - Developer Guide',
      description: 'Step-by-step guide to creating plugins for Vyral CMS using the plugin SDK.',
      keywords: ['vyral', 'plugin', 'development', 'tutorial'],
      noindex: false,
      nofollow: false
    },
    metadata: {},
    viewCount: 42,
    likeCount: 5,
    shareCount: 2,
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 86400000)
  }
];

const sampleCategories = [
  {
    name: 'Getting Started',
    slug: 'getting-started',
    description: 'Essential guides and tutorials for new users',
    postCount: 1,
    seo: {
      title: 'Getting Started with Vyral CMS',
      description: 'Essential guides and tutorials for getting started with Vyral CMS',
      noindex: false
    },
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Development',
    slug: 'development',
    description: 'Guides for developers building with Vyral CMS',
    postCount: 1,
    seo: {
      title: 'Vyral CMS Development Guides',
      description: 'Developer guides for building plugins, themes, and extending Vyral CMS',
      noindex: false
    },
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const sampleTags = [
  {
    name: 'Tutorial',
    slug: 'tutorial',
    description: 'Step-by-step tutorials and guides',
    postCount: 2,
    seo: { noindex: false },
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Plugin Development',
    slug: 'plugin-development',
    description: 'All about developing plugins for Vyral CMS',
    postCount: 1,
    seo: { noindex: false },
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const sampleSettings = [
  {
    key: 'site_title',
    value: 'Vyral CMS',
    type: 'string',
    group: 'general',
    label: 'Site Title',
    description: 'The title of your website',
    isPublic: true,
    isAutoload: true,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    key: 'site_description',
    value: 'A modern, plugin-based content management system',
    type: 'string',
    group: 'general',
    label: 'Site Description',
    description: 'A brief description of your website',
    isPublic: true,
    isAutoload: true,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    key: 'posts_per_page',
    value: 10,
    type: 'number',
    group: 'reading',
    label: 'Posts Per Page',
    description: 'Number of posts to show per page',
    isPublic: true,
    isAutoload: true,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function seedDatabase() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Get admin user ID
    const adminUser = await db.collection('users').findOne({ role: 'super_admin' });
    if (!adminUser) {
      console.error('No admin user found. Please run setup-db.js first.');
      return;
    }
    
    console.log('Seeding sample data...');
    
    // Insert categories
    const categoryResult = await db.collection('categories').insertMany(
      sampleCategories.map(cat => ({
        ...cat,
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      }))
    );
    console.log(`Inserted ${categoryResult.insertedCount} categories`);
    
    // Insert tags
    const tagResult = await db.collection('tags').insertMany(
      sampleTags.map(tag => ({
        ...tag,
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      }))
    );
    console.log(`Inserted ${tagResult.insertedCount} tags`);
    
    // Get category and tag IDs
    const categories = await db.collection('categories').find().toArray();
    const tags = await db.collection('tags').find().toArray();
    
    // Insert posts with category and tag references
    const postsToInsert = samplePosts.map((post, index) => ({
      ...post,
      author: adminUser._id,
      categories: index === 0 ? [categories[0]._id] : [categories[1]._id],
      tags: [tags[0]._id, ...(index === 1 ? [tags[1]._id] : [])],
      createdBy: adminUser._id,
      updatedBy: adminUser._id
    }));
    
    const postResult = await db.collection('posts').insertMany(postsToInsert);
    console.log(`Inserted ${postResult.insertedCount} posts`);
    
    // Insert settings
    const settingResult = await db.collection('settings').insertMany(
      sampleSettings.map(setting => ({
        ...setting,
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      }))
    );
    console.log(`Inserted ${settingResult.insertedCount} settings`);
    
    // Create default navigation
    const defaultNavigation = {
      name: 'Main Navigation',
      slug: 'main-navigation',
      location: 'header',
      isActive: true,
      items: [
        {
          id: 'home',
          label: 'Home',
          url: '/',
          type: 'custom',
          target: '_self',
          order: 0
        },
        {
          id: 'blog',
          label: 'Blog',
          url: '/blog',
          type: 'custom',
          target: '_self',
          order: 1
        },
        {
          id: 'about',
          label: 'About',
          url: '/about',
          type: 'custom',
          target: '_self',
          order: 2
        }
      ],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: adminUser._id,
      updatedBy: adminUser._id
    };
    
    await db.collection('navigations').insertOne(defaultNavigation);
    console.log('Created default navigation');
    
    console.log('Database seeding completed successfully!');
    
  } catch (error) {
    console.error('Database seeding failed:', error);
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

seedDatabase().catch(console.error);