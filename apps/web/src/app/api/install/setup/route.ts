// apps/web/src/app/api/install/setup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { installationManager } from '@/lib/installation';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';

interface InstallationRequest {
  purchaseCode: string;
  siteName: string;
  siteDescription?: string;
  adminUser: {
    username: string;
    email: string;
    password: string;
    displayName: string;
  };
  databaseConfig?: {
    seedSampleData: boolean;
  };
  securityConfig?: {
    enableTwoFactor: boolean;
    strongPasswordPolicy: boolean;
  };
}

interface InstallationResponse {
  success: boolean;
  message: string;
  data?: {
    siteUrl: string;
    adminUrl: string;
    adminCredentials: {
      username: string;
      email: string;
    };
    installationId: string;
    backupCodes?: string[];
  };
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check if already installed
    if (installationManager.isInstalled()) {
      return NextResponse.json({
        success: false,
        message: 'System is already installed',
        error: 'ALREADY_INSTALLED'
      }, { status: 400 });
    }

    const body: InstallationRequest = await request.json();
    const { purchaseCode, siteName, siteDescription, adminUser, databaseConfig, securityConfig } = body;

    // Validate required fields
    const validation = validateInstallationRequest(body);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        message: validation.message,
        error: 'VALIDATION_ERROR'
      }, { status: 400 });
    }

    // Verify purchase code is still valid and matches stored state
    const currentState = installationManager.getState();
    if (!currentState.purchaseCode || currentState.purchaseCode !== purchaseCode) {
      return NextResponse.json({
        success: false,
        message: 'Purchase code verification required',
        error: 'PURCHASE_CODE_MISMATCH'
      }, { status: 400 });
    }

    // Begin installation process
    console.log('Starting Vyral CMS installation...');

    // Step 1: Setup database
    await setupDatabase();
    console.log('✓ Database setup completed');

    // Step 2: Create admin user
    const adminUserData = await createAdminUser(adminUser, securityConfig?.enableTwoFactor || false);
    console.log('✓ Admin user created');

    // Step 3: Configure site settings
    await configureSiteSettings(siteName, siteDescription || '');
    console.log('✓ Site settings configured');

    // Step 4: Seed sample data if requested
    if (databaseConfig?.seedSampleData) {
      await seedSampleData();
      console.log('✓ Sample data seeded');
    }

    // Step 5: Setup security configurations
    await setupSecurityConfigurations(securityConfig);
    console.log('✓ Security configurations applied');

    // Step 6: Finalize installation
    installationManager.markAsInstalled(purchaseCode, siteName, adminUser);
    
    // Set environment variable for middleware (Edge Runtime compatibility)
    process.env.VYRAL_INSTALLED = 'true';
    
    // Step 7: Setup environment configurations
    await setupEnvironmentConfig();
    console.log('✓ Environment configured');

    // Generate backup codes for admin if 2FA is enabled
    let backupCodes: string[] | undefined;
    if (securityConfig?.enableTwoFactor) {
      backupCodes = generateBackupCodes();
      await storeBackupCodes(adminUserData.id, backupCodes);
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    return NextResponse.json({
      success: true,
      message: 'Vyral CMS installed successfully!',
      data: {
        siteUrl: baseUrl,
        adminUrl: `${baseUrl}/admin`,
        adminCredentials: {
          username: adminUser.username,
          email: adminUser.email
        },
        installationId: currentState.installationId!,
        backupCodes
      }
    });

  } catch (error) {
    console.error('Installation error:', error);
    
    // Clean up partial installation
    await cleanupFailedInstallation();
    
    return NextResponse.json({
      success: false,
      message: 'Installation failed. Please try again.',
      error: 'INSTALLATION_FAILED'
    }, { status: 500 });
  }
}

function validateInstallationRequest(request: InstallationRequest): { valid: boolean; message?: string } {
  if (!request.purchaseCode) {
    return { valid: false, message: 'Purchase code is required' };
  }

  if (!request.siteName || request.siteName.trim().length < 3) {
    return { valid: false, message: 'Site name must be at least 3 characters long' };
  }

  if (!request.adminUser) {
    return { valid: false, message: 'Admin user information is required' };
  }

  const { username, email, password, displayName } = request.adminUser;

  if (!username || username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, message: 'Username must be at least 3 characters and contain only letters, numbers, and underscores' };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, message: 'Valid email address is required' };
  }

  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }

  // Strong password check
  const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
  if (!strongPasswordPattern.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' };
  }

  if (!displayName || displayName.trim().length < 2) {
    return { valid: false, message: 'Display name must be at least 2 characters long' };
  }

  return { valid: true };
}

async function setupDatabase(): Promise<void> {
  const client = new MongoClient(process.env.MONGODB_URI!);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Create all necessary collections with indexes
    const collections = [
      {
        name: 'posts',
        indexes: [
          { spec: { slug: 1 }, options: { unique: true } },
          { spec: { status: 1, publishedAt: -1 }, options: {} },
          { spec: { type: 1, status: 1 }, options: {} },
          { spec: { author: 1 }, options: {} },
          { spec: { categories: 1 }, options: {} },
          { spec: { tags: 1 }, options: {} },
          { spec: { title: 'text', content: 'text', excerpt: 'text' }, options: {} }
        ]
      },
      {
        name: 'categories',
        indexes: [
          { spec: { slug: 1 }, options: { unique: true } },
          { spec: { parent: 1 }, options: {} },
          { spec: { name: 'text', description: 'text' }, options: {} }
        ]
      },
      {
        name: 'tags',
        indexes: [
          { spec: { slug: 1 }, options: { unique: true } },
          { spec: { name: 'text', description: 'text' }, options: {} }
        ]
      },
      {
        name: 'users',
        indexes: [
          { spec: { username: 1 }, options: { unique: true } },
          { spec: { email: 1 }, options: { unique: true } },
          { spec: { role: 1 }, options: {} },
          { spec: { status: 1 }, options: {} }
        ]
      },
      {
        name: 'media',
        indexes: [
          { spec: { filename: 1 }, options: {} },
          { spec: { uploadedBy: 1 }, options: {} },
          { spec: { mimeType: 1 }, options: {} },
          { spec: { tags: 1 }, options: {} },
          { spec: { title: 'text', alt: 'text', description: 'text' }, options: {} }
        ]
      },
      {
        name: 'comments',
        indexes: [
          { spec: { postId: 1 }, options: {} },
          { spec: { status: 1 }, options: {} },
          { spec: { parentId: 1 }, options: {} },
          { spec: { createdAt: -1 }, options: {} }
        ]
      },
      {
        name: 'settings',
        indexes: [
          { spec: { key: 1 }, options: { unique: true } },
          { spec: { group: 1 }, options: {} },
          { spec: { isAutoload: 1 }, options: {} }
        ]
      },
      {
        name: 'navigations',
        indexes: [
          { spec: { slug: 1 }, options: { unique: true } },
          { spec: { location: 1 }, options: {} }
        ]
      },
      {
        name: 'activities',
        indexes: [
          { spec: { userId: 1 }, options: {} },
          { spec: { resourceType: 1, resourceId: 1 }, options: {} },
          { spec: { createdAt: -1 }, options: {} }
        ]
      },
      {
        name: 'plugins',
        indexes: [
          { spec: { name: 1 }, options: { unique: true } },
          { spec: { status: 1 }, options: {} }
        ]
      },
      {
        name: 'themes',
        indexes: [
          { spec: { name: 1 }, options: { unique: true } },
          { spec: { status: 1 }, options: {} }
        ]
      }
    ];

    for (const collection of collections) {
      await db.createCollection(collection.name);
      
      for (const indexDef of collection.indexes) {
        // Remove undefined properties from index spec
        const cleanedSpec = Object.fromEntries(
          Object.entries(indexDef.spec).filter(([_, v]) => v !== undefined)
        );
        await db.collection(collection.name).createIndex(cleanedSpec, indexDef.options);
      }
    }

  } finally {
    await client.close();
  }
}

async function createAdminUser(adminUser: InstallationRequest['adminUser'], enableTwoFactor: boolean) {
  const client = new MongoClient(process.env.MONGODB_URI!);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({
      $or: [
        { username: adminUser.username },
        { email: adminUser.email }
      ]
    });

    if (existingUser) {
      throw new Error('Admin user already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminUser.password, 12);
    
    // Generate 2FA secret if enabled
    let twoFactorSecret: string | undefined = undefined;
    if (enableTwoFactor) {
      twoFactorSecret = randomBytes(32).toString('hex');
    }

    const userData = {
      username: adminUser.username,
      email: adminUser.email,
      password: hashedPassword,
      displayName: adminUser.displayName,
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
      metadata: {
        installationAdmin: true,
        createdDuringInstall: true
      },
      twoFactorEnabled: enableTwoFactor,
      twoFactorSecret: twoFactorSecret,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('users').insertOne(userData);
    
    return {
      id: result.insertedId.toString(),
      username: adminUser.username,
      email: adminUser.email,
      displayName: adminUser.displayName
    };

  } finally {
    await client.close();
  }
}

async function configureSiteSettings(siteName: string, siteDescription: string): Promise<void> {
  const client = new MongoClient(process.env.MONGODB_URI!);
  
  try {
    await client.connect();
    const db = client.db();
    
    const defaultSettings = [
      {
        key: 'site_name',
        value: siteName,
        group: 'general',
        type: 'string',
        isAutoload: true,
        label: 'Site Name',
        description: 'The name of your website'
      },
      {
        key: 'site_description',
        value: siteDescription,
        group: 'general',
        type: 'text',
        isAutoload: true,
        label: 'Site Description',
        description: 'A brief description of your website'
      },
      {
        key: 'site_url',
        value: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        group: 'general',
        type: 'url',
        isAutoload: true,
        label: 'Site URL',
        description: 'The URL of your website'
      },
      {
        key: 'admin_email',
        value: 'admin@example.com', // Will be updated with actual admin email
        group: 'general',
        type: 'email',
        isAutoload: true,
        label: 'Admin Email',
        description: 'Administrator email address'
      },
      {
        key: 'posts_per_page',
        value: '10',
        group: 'reading',
        type: 'number',
        isAutoload: true,
        label: 'Posts Per Page',
        description: 'Number of posts to show on blog pages'
      },
      {
        key: 'default_comment_status',
        value: 'open',
        group: 'discussion',
        type: 'select',
        isAutoload: true,
        label: 'Default Comment Status',
        description: 'Default comment status for new posts'
      },
      {
        key: 'users_can_register',
        value: 'false',
        group: 'general',
        type: 'boolean',
        isAutoload: true,
        label: 'Anyone can register',
        description: 'Allow visitors to register as users'
      },
      {
        key: 'default_role',
        value: 'subscriber',
        group: 'general',
        type: 'string',
        isAutoload: true,
        label: 'New User Default Role',
        description: 'Default role for new users'
      },
      {
        key: 'installation_date',
        value: new Date().toISOString(),
        group: 'system',
        type: 'datetime',
        isAutoload: false,
        label: 'Installation Date',
        description: 'When Vyral CMS was installed'
      },
      {
        key: 'vyral_version',
        value: '1.0.0',
        group: 'system',
        type: 'string',
        isAutoload: false,
        label: 'Vyral CMS Version',
        description: 'Current version of Vyral CMS'
      }
    ];

    for (const setting of defaultSettings) {
      await db.collection('settings').insertOne({
        ...setting,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

  } finally {
    await client.close();
  }
}

async function seedSampleData(): Promise<void> {
  const client = new MongoClient(process.env.MONGODB_URI!);
  
  try {
    await client.connect();
    const db = client.db();

    // Sample categories
    const sampleCategories = [
      {
        name: 'General',
        slug: 'general',
        description: 'General posts and updates',
        count: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Technology',
        slug: 'technology',
        description: 'Technology related posts',
        count: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const categoryResult = await db.collection('categories').insertMany(sampleCategories);

    // Sample tags
    const sampleTags = [
      { name: 'Welcome', slug: 'welcome', count: 0 },
      { name: 'Getting Started', slug: 'getting-started', count: 0 },
      { name: 'Vyral CMS', slug: 'vyral-cms', count: 0 }
    ];

    await db.collection('tags').insertMany(sampleTags.map(tag => ({
      ...tag,
      createdAt: new Date(),
      updatedAt: new Date()
    })));

    // Sample post
    const adminUser = await db.collection('users').findOne({ role: 'super_admin' });
    
    if (adminUser) {
      const samplePost = {
        title: 'Welcome to Vyral CMS',
        slug: 'welcome-to-vyral-cms',
        content: `<h2>Welcome to Your New Vyral CMS Installation!</h2>
                 <p>Congratulations! You have successfully installed Vyral CMS, a modern and powerful content management system built with Next.js.</p>
                 <h3>Getting Started</h3>
                 <p>Here are some things you might want to do:</p>
                 <ul>
                   <li>Customize your site settings in the admin panel</li>
                   <li>Create your first custom post</li>
                   <li>Install and configure plugins</li>
                   <li>Choose and customize a theme</li>
                 </ul>
                 <p>Visit the <a href="/admin">admin dashboard</a> to get started!</p>`,
        excerpt: 'Welcome to your new Vyral CMS installation. Get started with creating content and customizing your site.',
        status: 'published',
        type: 'post',
        author: adminUser._id,
        categories: [Object.values(categoryResult.insertedIds)[0]],
        tags: sampleTags.map(tag => tag.slug),
        publishedAt: new Date(),
        commentStatus: 'open',
        pingStatus: 'open',
        seo: {
          title: 'Welcome to Vyral CMS',
          description: 'Getting started with your new Vyral CMS installation',
          keywords: ['vyral', 'cms', 'welcome', 'getting started'],
          noindex: false,
          nofollow: false
        },
        metadata: {},
        viewCount: 0,
        likeCount: 0,
        shareCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('posts').insertOne(samplePost);
    }

  } finally {
    await client.close();
  }
}

async function setupSecurityConfigurations(securityConfig?: InstallationRequest['securityConfig']): Promise<void> {
  const client = new MongoClient(process.env.MONGODB_URI!);
  
  try {
    await client.connect();
    const db = client.db();

    const securitySettings = [
      {
        key: 'strong_password_policy',
        value: securityConfig?.strongPasswordPolicy ? 'true' : 'false',
        group: 'security',
        type: 'boolean',
        isAutoload: true,
        label: 'Strong Password Policy',
        description: 'Require strong passwords for all users'
      },
      {
        key: 'two_factor_auth_available',
        value: securityConfig?.enableTwoFactor ? 'true' : 'false',
        group: 'security',
        type: 'boolean',
        isAutoload: true,
        label: 'Two-Factor Authentication',
        description: 'Enable two-factor authentication'
      },
      {
        key: 'login_attempts_limit',
        value: '5',
        group: 'security',
        type: 'number',
        isAutoload: true,
        label: 'Login Attempts Limit',
        description: 'Maximum failed login attempts before lockout'
      },
      {
        key: 'session_timeout',
        value: '7200', // 2 hours
        group: 'security',
        type: 'number',
        isAutoload: true,
        label: 'Session Timeout (seconds)',
        description: 'Session timeout in seconds'
      }
    ];

    for (const setting of securitySettings) {
      await db.collection('settings').insertOne({
        ...setting,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

  } finally {
    await client.close();
  }
}

async function setupEnvironmentConfig(): Promise<void> {
  // This could write additional configuration files or update environment settings
  // For now, we'll just log that the step is completed
  console.log('Environment configuration completed');
}

function generateBackupCodes(): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < 8; i++) {
    const code = randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
  }
  
  return codes;
}

async function storeBackupCodes(userId: string, codes: string[]): Promise<void> {
  const client = new MongoClient(process.env.MONGODB_URI!);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Hash the codes before storing
    const hashedCodes = codes.map(code => createHash('sha256').update(code).digest('hex'));
    
    await db.collection('users').updateOne(
      { id: userId },
      { $set: { recoveryTokens: hashedCodes } }
    );

  } finally {
    await client.close();
  }
}

async function cleanupFailedInstallation(): Promise<void> {
  try {
    // This would clean up any partial installation data
    // For now, we'll just log the cleanup attempt
    console.log('Cleaning up failed installation...');
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}