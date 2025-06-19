import * as fs from 'fs/promises';
import * as path from 'path';
import { ModuleManifest, ModuleManifestSchema, ModuleSetting } from '../types/module';
import { ValidationError } from '../errors';
import * as semver from 'semver';

export class ModuleValidator {
  // FIXED: Support both .js and .ts entry points
  private readonly requiredFiles = ['manifest.json', 'package.json'];
  
  async validateModule(extractPath: string): Promise<ModuleManifest> {
    // 1. Check required files exist
    await this.checkRequiredFiles(extractPath);
    
    // 2. Load and validate manifest
    const manifest = await this.loadAndValidateManifest(extractPath);
    
    // 3. Validate package.json
    await this.validatePackageJson(extractPath, manifest);
    
    // 4. Check entry point exists (support both .js and .ts)
    await this.validateEntryPoint(extractPath, manifest);
    
    // 5. Validate migrations if any
    if (manifest.dbMigrations?.length) {
      await this.validateMigrations(extractPath, manifest.dbMigrations);
    }
    
    return manifest;
  }

  private async checkRequiredFiles(extractPath: string): Promise<void> {
    for (const file of this.requiredFiles) {
      try {
        await fs.access(path.join(extractPath, file));
      } catch {
        throw new ValidationError(`Required file missing: ${file}`);
      }
    }
  }

  private async loadAndValidateManifest(extractPath: string): Promise<ModuleManifest> {
    const manifestPath = path.join(extractPath, 'manifest.json');
    
    try {
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);
      
      // Validate against schema
      const validation = ModuleManifestSchema.safeParse(manifest);
      if (!validation.success) {
        const errors = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        throw new ValidationError(`Manifest validation failed: ${errors.join(', ')}`);
      }
      
      return manifest;
    } catch (error: any) {
      if (error instanceof ValidationError) throw error;
      throw new ValidationError(`Failed to parse manifest.json: ${error.message}`);
    }
  }

  private async validatePackageJson(extractPath: string, manifest: ModuleManifest): Promise<void> {
    const packagePath = path.join(extractPath, 'package.json');
    
    try {
      const packageContent = await fs.readFile(packagePath, 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      // Check name matches
      if (packageJson.name !== manifest.slug) {
        throw new ValidationError('Package name must match manifest slug');
      }
      
      // Check version matches
      if (packageJson.version !== manifest.version) {
        throw new ValidationError('Package version must match manifest version');
      }
      
    } catch (error: any) {
      if (error instanceof ValidationError) throw error;
      throw new ValidationError(`Invalid package.json: ${error.message}`);
    }
  }

  // FIXED: Support both .js and .ts entry points
  private async validateEntryPoint(extractPath: string, manifest: ModuleManifest): Promise<void> {
    const entryPath = path.join(extractPath, manifest.main);
    
    try {
      await fs.access(entryPath);
      return; // File exists, we're good
    } catch {
      // If the specified file doesn't exist, try common alternatives
      const possibleExtensions = ['.js', '.ts', '.mjs'];
      const baseName = manifest.main.replace(/\.(js|ts|mjs)$/, '');
      
      for (const ext of possibleExtensions) {
        try {
          const altPath = path.join(extractPath, baseName + ext);
          await fs.access(altPath);
          return; // Found alternative, we're good
        } catch {
          // Continue to next extension
        }
      }
      
      // Also check for index.js or index.ts if main file not found
      const indexFiles = ['index.js', 'index.ts', 'index.mjs'];
      for (const indexFile of indexFiles) {
        try {
          const indexPath = path.join(extractPath, indexFile);
          await fs.access(indexPath);
          return; // Found index file, we're good
        } catch {
          // Continue to next index file
        }
      }
      
      throw new ValidationError(
        `Entry point file not found: ${manifest.main}. ` +
        `Tried: ${manifest.main}, ${baseName}.js, ${baseName}.ts, index.js, index.ts`
      );
    }
  }

  private async validateMigrations(extractPath: string, migrations: string[]): Promise<void> {
    const migrationsPath = path.join(extractPath, 'migrations');
    
    try {
      await fs.access(migrationsPath);
    } catch {
      throw new ValidationError('Migrations directory not found');
    }
    
    for (const migration of migrations) {
      const migrationPath = path.join(migrationsPath, migration);
      try {
        await fs.access(migrationPath);
      } catch {
        throw new ValidationError(`Migration file not found: ${migration}`);
      }
    }
  }

  async checkCompatibility(manifest: ModuleManifest): Promise<{
    compatible: boolean;
    error?: string;
  }> {
    const currentVyralVersion = process.env.VYRAL_VERSION || '1.0.0';
    const currentNodeVersion = process.version;
    
    // Check Vyral CMS compatibility
    if (!semver.satisfies(currentVyralVersion, manifest.compatibility.vyralVersion)) {
      return {
        compatible: false,
        error: `Module requires Vyral CMS ${manifest.compatibility.vyralVersion}, current: ${currentVyralVersion}`
      };
    }
    
    // Check Node.js compatibility
    if (!semver.satisfies(currentNodeVersion, manifest.compatibility.nodeVersion)) {
      return {
        compatible: false,
        error: `Module requires Node.js ${manifest.compatibility.nodeVersion}, current: ${currentNodeVersion}`
      };
    }
    
    return { compatible: true };
  }

  async validateConfig(
    config: Record<string, any>, 
    settings?: ModuleSetting[]
  ): Promise<string[]> {
    if (!settings?.length) return [];
    
    const errors: string[] = [];
    
    for (const setting of settings) {
      const value = config[setting.key];
      
      // Check required fields
      if (setting.required && (value === undefined || value === null || value === '')) {
        errors.push(`${setting.label} is required`);
        continue;
      }
      
      if (value === undefined || value === null) continue;
      
      // Type validation
      switch (setting.type) {
        case 'number':
          if (typeof value !== 'number') {
            errors.push(`${setting.label} must be a number`);
            break;
          }
          if (setting.validation?.min !== undefined && value < setting.validation.min) {
            errors.push(`${setting.label} must be at least ${setting.validation.min}`);
          }
          if (setting.validation?.max !== undefined && value > setting.validation.max) {
            errors.push(`${setting.label} must be at most ${setting.validation.max}`);
          }
          break;
          
        case 'string':
        case 'textarea':
          if (typeof value !== 'string') {
            errors.push(`${setting.label} must be a string`);
            break;
          }
          if (setting.validation?.minLength && value.length < setting.validation.minLength) {
            errors.push(`${setting.label} must be at least ${setting.validation.minLength} characters`);
          }
          if (setting.validation?.maxLength && value.length > setting.validation.maxLength) {
            errors.push(`${setting.label} must be at most ${setting.validation.maxLength} characters`);
          }
          if (setting.validation?.pattern && !new RegExp(setting.validation.pattern).test(value)) {
            errors.push(`${setting.label} format is invalid`);
          }
          break;
          
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`${setting.label} must be true or false`);
          }
          break;
          
        case 'select':
          if (!setting.options?.some(opt => opt.value === value)) {
            errors.push(`${setting.label} must be one of the allowed values`);
          }
          break;
          
        case 'multiselect':
          if (!Array.isArray(value)) {
            errors.push(`${setting.label} must be an array`);
            break;
          }
          for (const val of value) {
            if (!setting.options?.some(opt => opt.value === val)) {
              errors.push(`${setting.label} contains invalid value: ${val}`);
              break;
            }
          }
          break;
      }
    }
    
    return errors;
  }
}