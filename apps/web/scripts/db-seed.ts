// apps/web/scripts/db-seed.ts
import mongoose from 'mongoose';

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

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database with sample data...\n');
    
    // Connect to database
    await connectDatabase();

    console.log('🔄 Creating sample categories...');
    
    // Get collections
    if (!mongoose.connection.db) {
      throw new Error('MongoDB connection is not established.');
    }
    const categoriesCollection = mongoose.connection.db.collection('categories');
    const postsCollection = mongoose.connection.db.collection('posts');
    const tagsCollection = mongoose.connection.db.collection('tags');
    const settingsCollection = mongoose.connection.db.collection('settings');
    
    // Sample categories
    const sampleCategories = [
      {
        name: 'Technology',
        slug: 'technology',
        description: 'All about technology trends and innovations',
        color: '#3b82f6',
        postCount: 0,
        seo: {
          title: 'Technology Articles',
          description: 'Latest technology news, trends, and innovations',
          keywords: ['technology', 'tech', 'innovation', 'digital'],
          noindex: false
        },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Business',
        slug: 'business',
        description: 'Business insights and strategies',
        color: '#10b981',
        postCount: 0,
        seo: {
          title: 'Business Articles',
          description: 'Business insights, strategies, and industry news',
          keywords: ['business', 'strategy', 'entrepreneur', 'startup'],
          noindex: false
        },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Lifestyle',
        slug: 'lifestyle',
        description: 'Lifestyle tips and trends',
        color: '#f59e0b',
        postCount: 0,
        seo: {
          title: 'Lifestyle Articles',
          description: 'Lifestyle tips, trends, and personal development',
          keywords: ['lifestyle', 'tips', 'wellness', 'personal development'],
          noindex: false
        },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Tutorials',
        slug: 'tutorials',
        description: 'Step-by-step guides and tutorials',
        color: '#8b5cf6',
        postCount: 0,
        seo: {
          title: 'Tutorials and Guides',
          description: 'Comprehensive tutorials and step-by-step guides',
          keywords: ['tutorial', 'guide', 'how-to', 'learning'],
          noindex: false
        },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Insert categories
    let categoriesCreated = 0;
    const categoryIds: { [key: string]: any } = {};
    
    for (const category of sampleCategories) {
      const result = await categoriesCollection.updateOne(
        { slug: category.slug },
        { $setOnInsert: { ...category, _id: new mongoose.Types.ObjectId() } },
        { upsert: true }
      );
      
      if (result.upsertedCount > 0) {
        categoriesCreated++;
        console.log(`   ✅ Created category: ${category.name}`);
        categoryIds[category.slug] = result.upsertedId;
      } else {
        console.log(`   ℹ️  Category already exists: ${category.name}`);
        const existing = await categoriesCollection.findOne({ slug: category.slug });
        categoryIds[category.slug] = existing?._id;
      }
    }
    
    console.log(`✅ Categories setup complete: ${categoriesCreated} created\n`);

    console.log('🔄 Creating sample tags...');
    
    // Sample tags
    const sampleTags = [
      { name: 'Getting Started', slug: 'getting-started', color: '#3b82f6' },
      { name: 'Tutorial', slug: 'tutorial', color: '#8b5cf6' },
      { name: 'Guide', slug: 'guide', color: '#10b981' },
      { name: 'Tips', slug: 'tips', color: '#f59e0b' },
      { name: 'CMS', slug: 'cms', color: '#ef4444' },
      { name: 'Next.js', slug: 'nextjs', color: '#000000' },
      { name: 'MongoDB', slug: 'mongodb', color: '#47a248' },
      { name: 'Web Development', slug: 'web-development', color: '#06b6d4' }
    ];

    let tagsCreated = 0;
    const tagIds: { [key: string]: any } = {};
    
    for (const tag of sampleTags) {
      const tagData = {
        ...tag,
        description: `Content related to ${tag.name}`,
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
        { $setOnInsert: { ...tagData, _id: new mongoose.Types.ObjectId() } },
        { upsert: true }
      );
      
      if (result.upsertedCount > 0) {
        tagsCreated++;
        console.log(`   ✅ Created tag: ${tag.name}`);
        tagIds[tag.slug] = result.upsertedId;
      } else {
        console.log(`   ℹ️  Tag already exists: ${tag.name}`);
        const existing = await tagsCollection.findOne({ slug: tag.slug });
        tagIds[tag.slug] = existing?._id;
      }
    }
    
    console.log(`✅ Tags setup complete: ${tagsCreated} created\n`);

    console.log('🔄 Creating sample posts...');
    
    // Sample posts with rich content
    const samplePosts = [
      {
        title: 'Welcome to Vyral CMS',
        slug: 'welcome-to-vyral-cms',
        content: `<h1>Welcome to Vyral CMS!</h1>
<p>Congratulations on successfully setting up your new Vyral CMS installation! This is your first sample post to help you get started with your content management journey.</p>

<h2>🚀 Getting Started</h2>
<p>Now that your CMS is up and running, here are some things you might want to explore:</p>

<h3>Admin Dashboard</h3>
<p>Access your admin dashboard at <code>/admin</code> to manage your content. You can:</p>
<ul>
<li>Create and edit posts and pages</li>
<li>Manage categories and tags</li>
<li>Upload and organize media files</li>
<li>Configure site settings</li>
<li>Install and manage plugins</li>
</ul>

<h3>Content Creation</h3>
<p>Vyral CMS comes with a powerful rich text editor that supports:</p>
<ul>
<li>Rich text formatting</li>
<li>Image and media embedding</li>
<li>Code syntax highlighting</li>
<li>Custom blocks and components</li>
</ul>

<h2>🎨 Customization</h2>
<p>Make your site unique by:</p>
<ul>
<li>Customizing themes and layouts</li>
<li>Adding custom CSS and JavaScript</li>
<li>Installing plugins for extended functionality</li>
<li>Configuring SEO settings</li>
</ul>

<h2>📚 Resources</h2>
<p>Check out our documentation for detailed guides on how to make the most of Vyral CMS. Happy publishing!</p>`,
        excerpt: 'Welcome to your new Vyral CMS installation! This guide will help you get started with managing your content.',
        status: 'published',
        type: 'post',
        categoryId: categoryIds['tutorials'],
        tags: ['getting-started', 'cms', 'tutorial'],
        publishedAt: new Date(),
        featuredImage: null,
        seo: {
          title: 'Welcome to Vyral CMS - Getting Started Guide',
          description: 'Learn how to get started with your new Vyral CMS installation and explore its powerful features.',
          keywords: ['vyral cms', 'getting started', 'tutorial', 'content management'],
          canonical: '',
          noindex: false
        },
        metadata: {
          readingTime: 3,
          wordCount: 245
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Building Modern Websites with Next.js',
        slug: 'building-modern-websites-with-nextjs',
        content: `<h1>Building Modern Websites with Next.js</h1>
<p>Next.js has revolutionized the way we build React applications. This powerful framework provides everything you need to build production-ready web applications.</p>

<h2>Why Choose Next.js?</h2>
<p>Next.js offers several advantages over traditional React applications:</p>

<h3>🚀 Performance</h3>
<ul>
<li>Server-side rendering (SSR) for faster initial page loads</li>
<li>Static site generation (SSG) for optimal performance</li>
<li>Automatic code splitting and optimization</li>
<li>Built-in image optimization</li>
</ul>

<h3>🛠️ Developer Experience</h3>
<ul>
<li>Zero configuration setup</li>
<li>Hot reloading for instant feedback</li>
<li>TypeScript support out of the box</li>
<li>Built-in CSS and Sass support</li>
</ul>

<h2>Key Features</h2>
<p>Let's explore some of the standout features that make Next.js a popular choice:</p>

<h3>App Router</h3>
<p>The new App Router in Next.js 13+ provides a more intuitive way to structure your application with improved performance and developer experience.</p>

<h3>API Routes</h3>
<p>Build full-stack applications with built-in API routes, allowing you to create backend functionality alongside your frontend code.</p>

<h2>Getting Started</h2>
<p>Ready to dive in? The Next.js documentation provides excellent tutorials and examples to help you build your first application.</p>`,
        excerpt: 'Discover the power of Next.js and learn why it\'s become the go-to framework for modern React applications.',
        status: 'published',
        type: 'post',
        categoryId: categoryIds['technology'],
        tags: ['nextjs', 'web-development', 'tutorial'],
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        featuredImage: null,
        seo: {
          title: 'Building Modern Websites with Next.js - Complete Guide',
          description: 'Learn how to build modern, performant websites using Next.js. Explore SSR, SSG, and other powerful features.',
          keywords: ['nextjs', 'react', 'web development', 'ssr', 'ssg'],
          canonical: '',
          noindex: false
        },
        metadata: {
          readingTime: 5,
          wordCount: 387
        },
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        title: 'Content Management Best Practices',
        slug: 'content-management-best-practices',
        content: `<h1>Content Management Best Practices</h1>
<p>Effective content management is crucial for maintaining a successful website. Whether you're managing a blog, corporate site, or e-commerce platform, following best practices ensures your content remains organized, discoverable, and valuable to your audience.</p>

<h2>📝 Content Strategy</h2>
<p>Before creating content, develop a clear strategy:</p>

<h3>Define Your Goals</h3>
<ul>
<li>Identify your target audience</li>
<li>Set clear objectives for each piece of content</li>
<li>Establish your brand voice and tone</li>
<li>Create content categories and themes</li>
</ul>

<h3>Content Planning</h3>
<ul>
<li>Develop an editorial calendar</li>
<li>Plan content themes and series</li>
<li>Schedule regular content audits</li>
<li>Set publishing schedules</li>
</ul>

<h2>🗂️ Organization</h2>
<p>Keep your content well-organized for easy management:</p>

<h3>Categorization</h3>
<ul>
<li>Use descriptive categories</li>
<li>Implement a logical taxonomy</li>
<li>Apply consistent tagging</li>
<li>Create content hierarchies</li>
</ul>

<h3>Metadata Management</h3>
<ul>
<li>Write compelling titles and descriptions</li>
<li>Optimize for search engines</li>
<li>Add alt text for images</li>
<li>Include relevant keywords naturally</li>
</ul>

<h2>🔄 Workflow Optimization</h2>
<p>Establish efficient workflows to streamline content creation and management.</p>`,
        excerpt: 'Learn essential best practices for effective content management to keep your website organized and engaging.',
        status: 'published',
        type: 'post',
        categoryId: categoryIds['business'],
        tags: ['cms', 'tips', 'guide'],
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        featuredImage: null,
        seo: {
          title: 'Content Management Best Practices - Essential Guide',
          description: 'Master content management with proven best practices for organization, strategy, and workflow optimization.',
          keywords: ['content management', 'cms', 'best practices', 'content strategy'],
          canonical: '',
          noindex: false
        },
        metadata: {
          readingTime: 4,
          wordCount: 312
        },
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      }
    ];

    // Insert posts
    let postsCreated = 0;
    
    for (const post of samplePosts) {
      const result = await postsCollection.updateOne(
        { slug: post.slug },
        { $setOnInsert: { ...post, _id: new mongoose.Types.ObjectId() } },
        { upsert: true }
      );
      
      if (result.upsertedCount > 0) {
        postsCreated++;
        console.log(`   ✅ Created post: ${post.title}`);
      } else {
        console.log(`   ℹ️  Post already exists: ${post.title}`);
      }
    }
    
    console.log(`✅ Posts setup complete: ${postsCreated} created\n`);

    console.log('🔄 Adding additional settings...');
    
    // Additional settings for complete CMS functionality
    const additionalSettings = [
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
        key: 'seo_title',
        value: 'Vyral CMS - Modern Content Management',
        type: 'string',
        group: 'seo',
        label: 'SEO Title',
        description: 'Default SEO title for your site',
        isPublic: true,
        isAutoload: true
      },
      {
        key: 'seo_description',
        value: 'A modern, fast, and flexible content management system built with Next.js and MongoDB.',
        type: 'string',
        group: 'seo',
        label: 'SEO Description',
        description: 'Default SEO description for your site',
        isPublic: true,
        isAutoload: true
      }
    ];

    let additionalSettingsCreated = 0;
    for (const setting of additionalSettings) {
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
        additionalSettingsCreated++;
        console.log(`   ✅ Created setting: ${setting.key}`);
      } else {
        console.log(`   ℹ️  Setting already exists: ${setting.key}`);
      }
    }
    
    console.log(`✅ Additional settings complete: ${additionalSettingsCreated} created\n`);

    // Verify data was created
    console.log('🔍 Verifying database seed...');
    
    const finalCategoriesCount = await categoriesCollection.countDocuments();
    const finalPostsCount = await postsCollection.countDocuments();
    const finalTagsCount = await tagsCollection.countDocuments();
    const finalSettingsCount = await settingsCollection.countDocuments();
    
    console.log(`   📂 Categories: ${finalCategoriesCount}`);
    console.log(`   📝 Posts: ${finalPostsCount}`);
    console.log(`   🏷️  Tags: ${finalTagsCount}`);
    console.log(`   ⚙️  Settings: ${finalSettingsCount}`);
    
    if (finalCategoriesCount === 0 || finalPostsCount === 0) {
      console.log('\n⚠️  Warning: Some collections appear to be empty');
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('');
    console.log('🌐 Your site is ready! Next steps:');
    console.log('   • Start the development server: npm run dev');
    console.log('   • Visit your site: http://localhost:3000');
    console.log('   • Access admin dashboard: http://localhost:3000/admin');
    console.log('   • Login with: admin@vyral.com / admin123');
    console.log('');
    console.log('📚 Sample content created:');
    console.log(`   • ${finalCategoriesCount} categories`);
    console.log(`   • ${finalPostsCount} blog posts`);
    console.log(`   • ${finalTagsCount} tags`);
    console.log('');
    console.log('⚠️  Remember to change the admin password after first login!');
    
  } catch (error) {
    console.error('\n❌ Database seeding failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default seedDatabase;