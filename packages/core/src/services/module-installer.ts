
import * as fs from 'fs/promises';
import * as fsSync from 'fs'; // Add this import for createReadStream
import * as path from 'path';
import { extract } from 'tar';
import * as unzip from 'unzipper';
import { ModuleManifest } from '../types/module';
import { ValidationError } from '../errors';

export class ModuleInstaller {
  private readonly modulesPath: string;
  private readonly tempPath: string;

  constructor() {
    this.modulesPath = process.env.MODULES_PATH || path.join(process.cwd(), 'modules');
    this.tempPath = path.join(process.cwd(), 'temp', 'modules');
  }

  async extractModule(fileBuffer: Buffer, filename: string): Promise<string> {
    // Create temp directory
    const extractId = `extract-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const extractPath = path.join(this.tempPath, extractId);
    await fs.mkdir(extractPath, { recursive: true });

    // Write file to temp
    const tempFilePath = path.join(extractPath, filename);
    await fs.writeFile(tempFilePath, fileBuffer);

    // Extract based on file type
    if (filename.endsWith('.zip')) {
      await this.extractZip(tempFilePath, extractPath);
    } else if (filename.endsWith('.tar.gz') || filename.endsWith('.tgz')) {
      await this.extractTarGz(tempFilePath, extractPath);
    } else {
      throw new ValidationError('Unsupported file format. Only .zip and .tar.gz are supported.');
    }

    // Remove the archive file
    await fs.unlink(tempFilePath);

    return extractPath;
  }

  // FIXED: Use fsSync.createReadStream instead of fs.createReadStream
  private async extractZip(filePath: string, extractPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fsSync.createReadStream(filePath)
        .pipe(unzip.Extract({ path: extractPath }))
        .on('error', reject)
        .on('close', resolve);
    });
  }

  private async extractTarGz(filePath: string, extractPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fsSync.createReadStream(filePath)
        .pipe(extract({ cwd: extractPath }))
        .on('error', reject)
        .on('end', resolve);
    });
  }

  async installFiles(manifest: ModuleManifest, sourcePath: string): Promise<string> {
    const moduleInstallPath = path.join(this.modulesPath, manifest.slug);
    
    // Check if module already exists
    try {
      await fs.access(moduleInstallPath);
      throw new ValidationError(`Module ${manifest.slug} is already installed`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }

    // Find the actual module folder (might be nested)
    const moduleSourcePath = await this.findModuleRoot(sourcePath);
    
    // Copy files to install location
    await this.copyDirectory(moduleSourcePath, moduleInstallPath);
    
    // Set proper permissions
    await this.setModulePermissions(moduleInstallPath);
    
    return moduleInstallPath;
  }

  private async findModuleRoot(extractPath: string): Promise<string> {
    // Look for manifest.json in the extracted files
    const files = await fs.readdir(extractPath);
    
    // Check if manifest.json is in the root
    if (files.includes('manifest.json')) {
      return extractPath;
    }
    
    // Check subdirectories
    for (const file of files) {
      const filePath = path.join(extractPath, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isDirectory()) {
        const subFiles = await fs.readdir(filePath);
        if (subFiles.includes('manifest.json')) {
          return filePath;
        }
      }
    }
    
    throw new ValidationError('Module manifest.json not found in archive');
  }

  private async setModulePermissions(modulePath: string): Promise<void> {
    // Set read/write permissions for the application
    await fs.chmod(modulePath, 0o755);
  }

  async removeFiles(installPath: string): Promise<void> {
    try {
      await fs.rm(installPath, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to remove module files at ${installPath}:`, error);
    }
  }
  async runMigrations(migrations: string[], modulePath: string): Promise<void> {
    console.log(`🔄 Running ${migrations.length} migrations for module at: ${modulePath}`);
    
    const migrationsPath = path.join(modulePath, 'migrations');
    
    // Check if migrations directory exists
    try {
      await fs.access(migrationsPath);
      console.log(`✅ Migrations directory found: ${migrationsPath}`);
    } catch (error) {
      console.error(`❌ Migrations directory not found: ${migrationsPath}`);
      throw new Error(`Migrations directory not found: ${migrationsPath}`);
    }
    
    for (const migration of migrations) {
      await this.runSingleMigration(migration, migrationsPath, modulePath);
    }
  }

  private async runSingleMigration(migration: string, migrationsPath: string, modulePath: string): Promise<void> {
    const migrationPath = path.join(migrationsPath, migration);
    
    console.log(`🔄 Running migration: ${migration}`);
    console.log(`📂 Migration path: ${migrationPath}`);
    
    try {
      // Check if migration file exists
      if (!fsSync.existsSync(migrationPath)) {
        throw new Error(`Migration file not found: ${migrationPath}`);
      }

      // Clear require cache to allow hot reloading
      const absolutePath = path.resolve(migrationPath);
      delete require.cache[absolutePath];
      
      // Try different import methods
      let migrationModule;
      
      try {
        // Method 1: Direct require (works better for .js files)
        migrationModule = require(absolutePath);
      } catch (requireError) {
        try {
          // Method 2: Dynamic import (ES modules)
          migrationModule = await import(absolutePath);
        } catch (importError) {
          console.error(`❌ Failed to load migration ${migration}:`, requireError, importError);
          throw new Error(`Failed to load migration ${migration}: ${requireError}`);
        }
      }
      
      console.log(`📦 Migration module loaded, checking for 'up' function...`);
      
      // Check for up function
      const upFunction = migrationModule.up || migrationModule.default?.up;
      
      if (typeof upFunction === 'function') {
        console.log(`⚡ Executing migration ${migration}...`);
        await upFunction();
        console.log(`✅ Migration ${migration} completed successfully`);
      } else {
        console.warn(`⚠️  Migration ${migration} has no 'up' function, skipping`);
      }
      
    } catch (error: any) {
      console.error(`❌ Migration ${migration} failed:`, error);
      throw new Error(`Migration ${migration} failed: ${error.message}`);
    }
  }

  async rollbackMigrations(migrations: string[], modulePath: string): Promise<void> {
    console.log(`🔄 Rolling back ${migrations.length} migrations for module at: ${modulePath}`);
    
    const migrationsPath = path.join(modulePath, 'migrations');
    
    // Run migrations in reverse order
    for (const migration of migrations.reverse()) {
      await this.rollbackSingleMigration(migration, migrationsPath, modulePath);
    }
  }

  private async rollbackSingleMigration(migration: string, migrationsPath: string, modulePath: string): Promise<void> {
    const migrationPath = path.join(migrationsPath, migration);
    
    console.log(`🔄 Rolling back migration: ${migration}`);
    
    try {
      if (!fsSync.existsSync(migrationPath)) {
        console.warn(`⚠️  Migration file not found for rollback: ${migrationPath}`);
        return;
      }

      const absolutePath = path.resolve(migrationPath);
      delete require.cache[absolutePath];
      
      let migrationModule;
      try {
        migrationModule = require(absolutePath);
      } catch (requireError) {
        try {
          migrationModule = await import(absolutePath);
        } catch (importError) {
          console.error(`❌ Failed to load migration for rollback ${migration}:`, requireError);
          // Continue with other rollbacks even if one fails
          return;
        }
      }
      
      const downFunction = migrationModule.down || migrationModule.default?.down;
      
      if (typeof downFunction === 'function') {
        console.log(`⚡ Rolling back migration ${migration}...`);
        await downFunction();
        console.log(`✅ Migration ${migration} rolled back successfully`);
      } else {
        console.warn(`⚠️  Migration ${migration} has no 'down' function, skipping rollback`);
      }
      
    } catch (error: any) {
      console.error(`❌ Migration rollback ${migration} failed:`, error);
      // Continue with other rollbacks even if one fails
    }
  }

  // FIXED: Ensure migrations directory is copied
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const files = await fs.readdir(src);
    
    console.log(`📂 Copying directory: ${src} -> ${dest}`);
    console.log(`📄 Files to copy: ${files.join(', ')}`);
    
    for (const file of files) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      const stat = await fs.stat(srcPath);
      
      if (stat.isDirectory()) {
        console.log(`📁 Copying directory: ${file}`);
        await this.copyDirectory(srcPath, destPath);
      } else {
        console.log(`📄 Copying file: ${file}`);
        await fs.copyFile(srcPath, destPath);
      }
    }
    
    console.log(`✅ Directory copy completed: ${dest}`);
  }

  async cleanupTemp(): Promise<void> {
    try {
      const tempFiles = await fs.readdir(this.tempPath);
      const now = Date.now();
      
      for (const file of tempFiles) {
        const filePath = path.join(this.tempPath, file);
        const stat = await fs.stat(filePath);
        
        // Remove files older than 1 hour
        if (now - stat.mtime.getTime() > 60 * 60 * 1000) {
          await fs.rm(filePath, { recursive: true, force: true });
        }
      }
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
    }
  }
}