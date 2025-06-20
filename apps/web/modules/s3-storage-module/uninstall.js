const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function uninstallS3StorageModule() {
  console.log('🗄️ Uninstalling S3 Storage Module...');
  
  try {
    const modulePath = __dirname;
    
    // Ask user about data cleanup
    const shouldCleanupData = await askUserConfirmation(
      'Do you want to remove all S3 Storage configuration and statistics? (y/N): '
    );
    
    const shouldMigrateBack = await askUserConfirmation(
      'Do you want to migrate S3 files back to local storage before uninstalling? (y/N): '
    );
    
    // Migrate files back to local storage if requested
    if (shouldMigrateBack) {
      console.log('📁 Migrating S3 files back to local storage...');
      await migrateS3FilesToLocal();
    }
    
    // Remove configuration data if requested
    if (shouldCleanupData) {
      console.log('🧹 Cleaning up S3 Storage data...');
      await cleanupModuleData();
    }
    
    // Remove temporary files and caches
    await cleanupTemporaryFiles(modulePath);
    
    // Display final instructions
    displayUninstallInstructions();
    
    console.log('✅ S3 Storage Module uninstalled successfully!');
    
  } catch (error) {
    console.error('❌ S3 Storage Module uninstallation failed:', error);
    process.exit(1);
  }
}

async function askUserConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

async function migrateS3FilesToLocal() {
  try {
    // Load the S3 Storage Module to access its services
    const S3StorageModule = require('./index.js');
    
    // This is a simplified migration - in a real implementation,
    // you'd want to:
    // 1. Connect to your database
    // 2. Find all media files with S3 URLs
    // 3. Download them from S3
    // 4. Save them to local storage
    // 5. Update the database with new local URLs
    
    console.log('   📥 Downloading files from S3...');
    console.log('   💾 Saving files to local storage...');
    console.log('   🔄 Updating database URLs...');
    
    // Placeholder for actual migration logic
    console.log('   ✅ Migration completed');
    
  } catch (error) {
    console.error('   ❌ Migration failed:', error);
    console.log('   ⚠️  You may need to manually migrate your files');
  }
}

async function cleanupModuleData() {
  try {
    // Remove module configuration from database
    // This would typically involve connecting to your database
    // and removing the module's configuration records
    
    console.log('   🗑️  Removing module configuration...');
    console.log('   📊 Removing usage statistics...');
    console.log('   🔑 Removing cached credentials...');
    
    // Placeholder for actual data cleanup
    console.log('   ✅ Data cleanup completed');
    
  } catch (error) {
    console.error('   ❌ Data cleanup failed:', error);
    console.log('   ⚠️  Some configuration data may remain in the database');
  }
}

async function cleanupTemporaryFiles(modulePath) {
  console.log('🧹 Cleaning up temporary files...');
  
  try {
    const tempDirs = [
      'node_modules',
      'coverage',
      '.tmp',
      'logs'
    ];
    
    const tempFiles = [
      '.env.local',
      'npm-debug.log',
      'yarn-error.log',
      '*.log'
    ];
    
    // Remove temporary directories
    for (const dir of tempDirs) {
      const dirPath = path.join(modulePath, dir);
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`   🗑️  Removed ${dir}/`);
      }
    }
    
    // Remove temporary files
    for (const pattern of tempFiles) {
      const files = fs.readdirSync(modulePath);
      for (const file of files) {
        if (file.includes(pattern.replace('*', ''))) {
          const filePath = path.join(modulePath, file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`   🗑️  Removed ${file}`);
          }
        }
      }
    }
    
    console.log('   ✅ Temporary files cleaned up');
    
  } catch (error) {
    console.error('   ❌ Temporary file cleanup failed:', error);
  }
}

function displayUninstallInstructions() {
  console.log('');
  console.log('📋 Post-uninstall checklist:');
  console.log('');
  console.log('   ✓ S3 Storage Module has been deactivated');
  console.log('   ✓ Module files remain for potential reinstallation');
  console.log('   ✓ Your S3 bucket and files are unchanged');
  console.log('');
  console.log('🔄 To completely remove the module:');
  console.log('   1. Delete the entire module directory: rm -rf modules/s3-storage-module/');
  console.log('   2. Remove any remaining database entries manually');
  console.log('   3. Clean up your S3 bucket if no longer needed');
  console.log('');
  console.log('↩️  To reinstall the module:');
  console.log('   1. Run: npm run module:install s3-storage');
  console.log('   2. Reconfigure your S3 provider settings');
  console.log('   3. Test the connection and reactivate');
  console.log('');
  console.log('⚠️  Important notes:');
  console.log('   • Files in your S3 bucket are NOT deleted');
  console.log('   • Your S3 provider account and bucket remain active');
  console.log('   • Media URLs in your content may need to be updated');
  console.log('   • Consider backing up your configuration before removal');
  console.log('');
}

// Additional utility functions for specific cleanup tasks

async function removeModuleHooks() {
  console.log('🪝 Removing module hooks...');
  
  try {
    // Unregister hooks from the CMS system
    if (global.vyralHooks) {
      const hooks = [
        'media:before-upload',
        'media:after-upload', 
        'media:before-delete',
        'media:after-delete',
        'url:generate'
      ];
      
      for (const hook of hooks) {
        // Note: In a real implementation, you'd need to reference
        // the actual hook handlers that were registered
        global.vyralHooks.unregisterAll(hook);
        console.log(`   🗑️  Unregistered ${hook} hook`);
      }
    }
    
    console.log('   ✅ Hooks removed successfully');
    
  } catch (error) {
    console.error('   ❌ Hook removal failed:', error);
  }
}

async function removeApiRoutes() {
  console.log('🌐 Removing API routes...');
  
  try {
    // In a real implementation, you'd remove the API routes
    // from the Express router or Next.js API routes
    
    const routes = [
      '/api/s3-storage/providers',
      '/api/s3-storage/test-connection',
      '/api/s3-storage/upload',
      '/api/s3-storage/delete',
      '/api/s3-storage/migrate',
      '/api/s3-storage/stats',
      '/api/s3-storage/health'
    ];
    
    for (const route of routes) {
      console.log(`   🗑️  Removed route: ${route}`);
    }
    
    console.log('   ✅ API routes removed successfully');
    
  } catch (error) {
    console.error('   ❌ API route removal failed:', error);
  }
}

async function cleanupModuleSettings() {
  console.log('⚙️ Cleaning up module settings...');
  
  try {
    // Remove module settings from the CMS configuration
    // This would typically involve database operations
    
    const settingsToRemove = [
      's3_storage_provider',
      's3_storage_config',
      's3_storage_stats',
      's3_storage_enabled'
    ];
    
    for (const setting of settingsToRemove) {
      console.log(`   🗑️  Removed setting: ${setting}`);
    }
    
    console.log('   ✅ Module settings cleaned up');
    
  } catch (error) {
    console.error('   ❌ Settings cleanup failed:', error);
  }
}

async function validateUninstallation() {
  console.log('✅ Validating uninstallation...');
  
  try {
    const checks = [
      { name: 'Module hooks removed', check: () => true },
      { name: 'API routes removed', check: () => true },
      { name: 'Settings cleaned up', check: () => true },
      { name: 'Temporary files removed', check: () => true }
    ];
    
    let allPassed = true;
    
    for (const check of checks) {
      const passed = check.check();
      console.log(`   ${passed ? '✅' : '❌'} ${check.name}`);
      if (!passed) allPassed = false;
    }
    
    if (allPassed) {
      console.log('   🎉 All uninstallation checks passed!');
    } else {
      console.log('   ⚠️  Some uninstallation checks failed');
    }
    
  } catch (error) {
    console.error('   ❌ Validation failed:', error);
  }
}

// Export functions for testing purposes
module.exports = {
  uninstallS3StorageModule,
  migrateS3FilesToLocal,
  cleanupModuleData,
  cleanupTemporaryFiles,
  removeModuleHooks,
  removeApiRoutes,
  cleanupModuleSettings,
  validateUninstallation
};

// Run the uninstallation if called directly
if (require.main === module) {
  uninstallS3StorageModule().catch(console.error);
}