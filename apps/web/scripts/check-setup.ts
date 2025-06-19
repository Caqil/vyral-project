// apps/web/scripts/check-setup.ts
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

interface CheckResult {
  category: string;
  item: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

// Direct MongoDB connection
async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
}

async function checkSetup(): Promise<void> {
  const results: CheckResult[] = [];
  
  console.log('🔍 Performing comprehensive Vyral CMS setup check...\n');

  // Check 1: Environment file exists
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    results.push({
      category: 'Environment',
      item: '.env.local file',
      status: 'pass',
      message: 'Environment file exists'
    });
  } else {
    results.push({
      category: 'Environment',
      item: '.env.local file',
      status: 'fail',
      message: 'Missing .env.local file'
    });
  }

  // Check 2: Required environment variables
  const requiredEnvVars = [
    'MONGODB_URI',
    'NEXTAUTH_SECRET', 
    'JWT_SECRET',
    'NEXTAUTH_URL'
  ];
  
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (value) {
      // Check if it's not a placeholder value
      const isPlaceholder = value.includes('your-') || value.includes('change-this') || value.includes('example');
      
      results.push({
        category: 'Environment',
        item: envVar,
        status: isPlaceholder ? 'warning' : 'pass',
        message: isPlaceholder ? `${envVar} is set but appears to be a placeholder` : `${envVar} is properly configured`
      });
    } else {
      results.push({
        category: 'Environment',
        item: envVar,
        status: 'fail',
        message: `${envVar} is missing`
      });
    }
  }

  // Check 3: Database connection and detailed analysis
  try {
    await connectDatabase();
    results.push({
      category: 'Database',
      item: 'Connection',
      status: 'pass',
      message: 'MongoDB connection successful'
    });

    console.log('📊 Analyzing database collections...\n');

    // Check 4: Detailed collection analysis
    const collections = [
      { name: 'users', required: true, expectedMin: 1 },
      { name: 'settings', required: true, expectedMin: 5 },
      { name: 'posts', required: false, expectedMin: 0 },
      { name: 'categories', required: false, expectedMin: 0 },
      { name: 'tags', required: false, expectedMin: 0 },
      { name: 'comments', required: false, expectedMin: 0 },
      { name: 'media', required: false, expectedMin: 0 }
    ];

    for (const collectionInfo of collections) {
      try {
        if (!mongoose.connection.db) {
          results.push({
            category: 'Database Collections',
            item: `${collectionInfo.name} collection`,
            status: 'fail',
            message: `Database connection is not established (db is undefined)`
          });
          continue;
        }
        const collection = mongoose.connection.db.collection(collectionInfo.name);
        const count = await collection.countDocuments();
        
        let status: 'pass' | 'fail' | 'warning' = 'pass';
        let message = `${collectionInfo.name} collection has ${count} documents`;
        
        if (collectionInfo.required && count < collectionInfo.expectedMin) {
          status = 'fail';
          message = `${collectionInfo.name} collection is empty (required)`;
        } else if (!collectionInfo.required && count === 0) {
          status = 'warning';
          message = `${collectionInfo.name} collection is empty (optional)`;
        }
        
        results.push({
          category: 'Database Collections',
          item: `${collectionInfo.name} collection`,
          status,
          message,
          details: { count, required: collectionInfo.required }
        });

        // Sample a few documents for critical collections
        if (count > 0 && ['users', 'settings'].includes(collectionInfo.name)) {
          const samples = await collection.find({}).limit(3).toArray();
          console.log(`   📄 Sample ${collectionInfo.name} documents:`);
          samples.forEach((doc, index) => {
            if (collectionInfo.name === 'users') {
              console.log(`      ${index + 1}. User: ${doc.email || doc.username} (role: ${doc.role})`);
            } else if (collectionInfo.name === 'settings') {
              console.log(`      ${index + 1}. Setting: ${doc.key} = ${JSON.stringify(doc.value)}`);
            }
          });
          console.log('');
        }
        
      } catch (error) {
        results.push({
          category: 'Database Collections',
          item: `${collectionInfo.name} collection`,
          status: 'fail',
          message: `Failed to check ${collectionInfo.name}: ${error}`
        });
      }
    }

    // Check 5: Specific admin user verification
    try {
      if (!mongoose.connection.db) {
        results.push({
          category: 'Admin Setup',
          item: 'Default admin user',
          status: 'fail',
          message: 'Database connection is not established (db is undefined)'
        });
      } else {
        const usersCollection = mongoose.connection.db.collection('users');
        const adminUser = await usersCollection.findOne({ email: 'admin@vyral.com' });
        
        if (adminUser) {
          const hasValidFields = adminUser.username && adminUser.email && adminUser.password && adminUser.role === 'admin';
          
          results.push({
            category: 'Admin Setup',
            item: 'Default admin user',
            status: hasValidFields ? 'pass' : 'warning',
            message: hasValidFields 
              ? 'Default admin user exists with required fields'
              : 'Default admin user exists but may be missing required fields',
            details: {
              username: adminUser.username,
              email: adminUser.email,
              role: adminUser.role,
              status: adminUser.status,
              hasPassword: !!adminUser.password
            }
          });
        } else {
          results.push({
            category: 'Admin Setup',
            item: 'Default admin user',
            status: 'fail',
            message: 'Default admin user not found'
          });
        }
      }
    } catch (error) {
      results.push({
        category: 'Admin Setup',
        item: 'Default admin user',
        status: 'fail',
        message: `Failed to check admin user: ${error}`
      });
    }

    // Check 6: Critical settings verification
    try {
      if (!mongoose.connection.db) {
        results.push({
          category: 'Settings',
          item: 'Critical settings',
          status: 'fail',
          message: 'Database connection is not established (db is undefined)'
        });
      } else {
        const settingsCollection = mongoose.connection.db.collection('settings');
        const criticalSettings = ['site_title', 'site_description', 'admin_email'];
        
        for (const settingKey of criticalSettings) {
          const setting = await settingsCollection.findOne({ key: settingKey });
          
          if (setting) {
            results.push({
              category: 'Settings',
              item: `${settingKey} setting`,
              status: 'pass',
              message: `${settingKey} is configured`,
              details: { value: setting.value, type: setting.type }
            });
          } else {
            results.push({
              category: 'Settings',
              item: `${settingKey} setting`,
              status: 'fail',
              message: `${settingKey} setting is missing`
            });
          }
        }
      }
    } catch (error) {
      results.push({
        category: 'Settings',
        item: 'Critical settings',
        status: 'fail',
        message: `Failed to check settings: ${error}`
      });
    }

    // Check 7: Database indexes
    try {
      const collectionsToCheck = ['users', 'settings', 'posts'];
      
      for (const collectionName of collectionsToCheck) {
        if (!mongoose.connection.db) {
          results.push({
            category: 'Database Indexes',
            item: `${collectionName} indexes`,
            status: 'fail',
            message: `Database connection is not established (db is undefined)`
          });
          continue;
        }
        const collection = mongoose.connection.db.collection(collectionName);
        const indexes = await collection.listIndexes().toArray();
        
        results.push({
          category: 'Database Indexes',
          item: `${collectionName} indexes`,
          status: indexes.length > 1 ? 'pass' : 'warning', // More than just _id index
          message: `${collectionName} has ${indexes.length} indexes`,
          details: { indexCount: indexes.length }
        });
      }
    } catch (error) {
      results.push({
        category: 'Database Indexes',
        item: 'Index analysis',
        status: 'warning',
        message: `Could not analyze indexes: ${error}`
      });
    }

  } catch (error) {
    results.push({
      category: 'Database',
      item: 'Connection',
      status: 'fail',
      message: `Database connection failed: ${error}`
    });
  }

  // Check 8: File system requirements
  const requiredDirs = [
    { path: 'public/uploads', required: false },
    { path: 'src/app', required: true },
    { path: 'scripts', required: true },
    { path: 'src/components', required: false },
    { path: 'src/lib', required: true }
  ];
  
  for (const dir of requiredDirs) {
    const dirPath = path.join(process.cwd(), dir.path);
    if (fs.existsSync(dirPath)) {
      results.push({
        category: 'File System',
        item: `${dir.path} directory`,
        status: 'pass',
        message: `${dir.path} directory exists`
      });
    } else {
      results.push({
        category: 'File System',
        item: `${dir.path} directory`,
        status: dir.required ? 'fail' : 'warning',
        message: `${dir.path} directory missing`
      });
    }
  }

  // Check 9: Required scripts
  const requiredScripts = ['db-setup.ts', 'db-seed.ts', 'check-setup.ts'];
  for (const script of requiredScripts) {
    const scriptPath = path.join(process.cwd(), 'scripts', script);
    if (fs.existsSync(scriptPath)) {
      results.push({
        category: 'Scripts',
        item: script,
        status: 'pass',
        message: `${script} exists`
      });
    } else {
      results.push({
        category: 'Scripts',
        item: script,
        status: 'fail',
        message: `${script} missing`
      });
    }
  }

  // Check 10: Package.json scripts
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      const requiredScripts = ['db:setup', 'db:seed', 'db:check'];
      
      for (const scriptName of requiredScripts) {
        if (packageContent.scripts && packageContent.scripts[scriptName]) {
          results.push({
            category: 'Package Scripts',
            item: `${scriptName} script`,
            status: 'pass',
            message: `${scriptName} script is defined`
          });
        } else {
          results.push({
            category: 'Package Scripts',
            item: `${scriptName} script`,
            status: 'fail',
            message: `${scriptName} script is missing from package.json`
          });
        }
      }
    }
  } catch (error) {
    results.push({
      category: 'Package Scripts',
      item: 'package.json analysis',
      status: 'warning',
      message: `Could not analyze package.json: ${error}`
    });
  }

  // Display results
  console.log('📋 Detailed Setup Check Results:\n');
  
  const categories = [...new Set(results.map(r => r.category))];
  
  for (const category of categories) {
    console.log(`\n📁 ${category}:`);
    
    const categoryResults = results.filter(r => r.category === category);
    for (const result of categoryResults) {
      const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      console.log(`  ${icon} ${result.item}: ${result.message}`);
      
      // Show additional details for important items
      if (result.details && ['admin user', 'settings'].some(keyword => 
        result.item.toLowerCase().includes(keyword))) {
        console.log(`     Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    }
  }

  // Summary and recommendations
  const passCount = results.filter(r => r.status === 'pass').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  const failCount = results.filter(r => r.status === 'fail').length;

  console.log('\n📈 Summary:');
  console.log(`  ✅ Passed: ${passCount}`);
  console.log(`  ⚠️  Warnings: ${warningCount}`);
  console.log(`  ❌ Failed: ${failCount}`);

  // Specific recommendations
  if (failCount > 0) {
    console.log('\n🔧 Recommended Actions:');
    const failedResults = results.filter(r => r.status === 'fail');
    
    if (failedResults.some(r => r.item.includes('.env'))) {
      console.log('  • Create .env.local file: cp .env.local.example .env.local');
    }
    
    if (failedResults.some(r => r.item.includes('admin user') || r.item.includes('settings'))) {
      console.log('  • Run database setup: npm run db:setup');
    }
    
    if (failedResults.some(r => r.item.includes('collection') && r.details?.required)) {
      console.log('  • Your database setup failed - check your MongoDB connection and run setup again');
    }
    
    if (failedResults.some(r => r.item.includes('script'))) {
      console.log('  • Create missing database scripts in the scripts/ directory');
      console.log('  • Update package.json with missing script definitions');
    }
    
    if (failedResults.some(r => r.item.includes('Connection'))) {
      console.log('  • Check MongoDB is running and MONGODB_URI is correct');
      console.log('  • Verify your database credentials and network connectivity');
    }
  } else if (warningCount > 0) {
    console.log('\n💡 Suggestions:');
    const warningResults = results.filter(r => r.status === 'warning');
    
    if (warningResults.some(r => r.item.includes('collection') && r.message.includes('empty'))) {
      console.log('  • Run: npm run db:seed (to add sample data)');
    }
    
    if (warningResults.some(r => r.item.includes('placeholder'))) {
      console.log('  • Update placeholder values in .env.local with real values');
    }
    
    console.log('  • Create missing optional directories if needed');
  } else {
    console.log('\n🎉 Excellent! Your Vyral CMS setup is complete and healthy.');
    console.log('   • Start development: npm run dev');
    console.log('   • Access your site: http://localhost:3000');
    console.log('   • Access admin: http://localhost:3000/admin');
    console.log('   • Login: admin@vyral.com / admin123');
  }

  // Database connection cleanup
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }

  process.exit(failCount > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  checkSetup().catch((error) => {
    console.error('❌ Setup check failed:', error);
    process.exit(1);
  });
}

export default checkSetup;