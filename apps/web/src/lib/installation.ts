import { createHash } from 'crypto';

export interface InstallationState {
  isInstalled: boolean;
  purchaseCode?: string;
  purchaseCodeHash?: string;
  installationId?: string;
  siteName?: string;
  adminUser?: {
    username: string;
    email: string;
    displayName: string;
  };
  installedAt?: string;
  version: string;
}

export class InstallationManager {
  private readonly configPath: string;
  private readonly lockPath: string;
  private readonly securityKeys: string[];
  private static _instance: InstallationManager;

  constructor() {
    // Use relative paths that work in both Node.js and Edge Runtime
    this.configPath = '.vyral-install.json';
    this.lockPath = '.vyral-lock';
    
    // Multiple security keys to prevent easy bypassing
    this.securityKeys = [
      process.env.VYRAL_SECURITY_KEY || this.generateSecurityKey(),
      process.env.NEXTAUTH_SECRET || '',
      process.env.JWT_SECRET || ''
    ].filter(Boolean);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): InstallationManager {
    if (!InstallationManager._instance) {
      InstallationManager._instance = new InstallationManager();
    }
    return InstallationManager._instance;
  }

  /**
   * Check if the system is already installed (Edge Runtime compatible)
   */
  public isInstalled(): boolean {
    try {
      // For Edge Runtime, we'll use a different approach
      if (typeof window !== 'undefined') {
        // Browser environment
        return false;
      }

      // Check if we're in Edge Runtime
      if (typeof globalThis !== 'undefined' && typeof (globalThis as any).EdgeRuntime !== 'undefined' || !this.canAccessFileSystem()) {
        // In Edge Runtime, check environment variable as fallback
        return process.env.VYRAL_INSTALLED === 'true';
      }

      // Node.js environment - use file system
      return this.checkFileSystemInstallation();
    } catch {
      return false;
    }
  }

  /**
   * Get current installation state (Node.js only)
   */
  public getState(): InstallationState {
    try {
      if (!this.canAccessFileSystem()) {
        return this.getDefaultState();
      }

      const fs = require('fs');
      if (!fs.existsSync(this.configPath)) {
        return this.getDefaultState();
      }

      const content = fs.readFileSync(this.configPath, 'utf-8');
      const state = JSON.parse(content) as InstallationState;
      
      if (!this.verifyIntegrity(state)) {
        throw new Error('Installation integrity check failed');
      }

      return state;
    } catch {
      return this.getDefaultState();
    }
  }

  /**
   * Update installation state (Node.js only)
   */
  public setState(updates: Partial<InstallationState>): void {
    if (!this.canAccessFileSystem()) {
      throw new Error('File system access not available in Edge Runtime');
    }

    const currentState = this.getState();
    const newState: InstallationState = {
      ...currentState,
      ...updates,
      version: '1.0.0'
    };

    // Generate new hashes with updated data
    if (updates.purchaseCode) {
      newState.purchaseCodeHash = this.hashPurchaseCode(updates.purchaseCode);
      newState.installationId = this.generateInstallationId(updates.purchaseCode);
    }

    this.saveState(newState);
  }

  /**
   * Mark system as installed (Node.js only)
   */
  public markAsInstalled(purchaseCode: string, siteName: string, adminUser: any): void {
    if (!this.canAccessFileSystem()) {
      throw new Error('File system access not available in Edge Runtime');
    }

    const installationId = this.generateInstallationId(purchaseCode);
    
    const state: InstallationState = {
      isInstalled: true,
      purchaseCode,
      purchaseCodeHash: this.hashPurchaseCode(purchaseCode),
      installationId,
      siteName,
      adminUser: {
        username: adminUser.username,
        email: adminUser.email,
        displayName: adminUser.displayName
      },
      installedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    this.saveState(state);
    this.createLockFile(state);
    
    // Set environment variable for Edge Runtime
    process.env.VYRAL_INSTALLED = 'true';
  }

  /**
   * Verify purchase code format and basic validation
   */
  public validatePurchaseCodeFormat(code: string): boolean {
    // CodeCanyon purchase codes are typically 36 characters with hyphens
    const codePattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    return codePattern.test(code);
  }

  /**
   * Check if purchase code is already used
   */
  public isPurchaseCodeUsed(code: string): boolean {
    const state = this.getState();
    if (!state.purchaseCodeHash) return false;
    
    const codeHash = this.hashPurchaseCode(code);
    return state.purchaseCodeHash === codeHash;
  }

  /**
   * Generate installation fingerprint for additional security
   */
  public generateFingerprint(): string {
    const factors = [
      process.env.HOSTNAME || 'localhost',
      process.env.SERVER_NAME || 'vyral-cms',
      new Date().toDateString(), // Daily rotation
      this.securityKeys.join('')
    ];

    return createHash('sha256')
      .update(factors.join('|'))
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Check if we can access the file system (Node.js runtime check)
   */
  private canAccessFileSystem(): boolean {
    try {
      // Try to access fs module
      require('fs');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check installation via file system (Node.js only)
   */
  private checkFileSystemInstallation(): boolean {
    try {
      const fs = require('fs');
      
      if (!fs.existsSync(this.configPath) || !fs.existsSync(this.lockPath)) {
        return false;
      }

      const state = this.getState();
      return state.isInstalled && this.verifyIntegrity(state);
    } catch {
      return false;
    }
  }

  /**
   * Verify system integrity
   */
  private verifyIntegrity(state: InstallationState): boolean {
    try {
      if (!this.canAccessFileSystem()) {
        return true; // Skip file checks in Edge Runtime
      }

      // Check if required fields exist
      if (!state.installationId || !state.purchaseCodeHash) {
        return false;
      }

      const fs = require('fs');

      // Verify lock file exists and matches
      if (!fs.existsSync(this.lockPath)) {
        return false;
      }

      const lockContent = fs.readFileSync(this.lockPath, 'utf-8');
      const lockData = JSON.parse(lockContent);
      
      return lockData.installationId === state.installationId &&
             lockData.hash === this.generateLockHash(state);
    } catch {
      return false;
    }
  }

  /**
   * Hash purchase code for storage
   */
  private hashPurchaseCode(code: string): string {
    return createHash('sha256')
      .update(code + this.securityKeys.join(''))
      .digest('hex');
  }

  /**
   * Generate unique installation ID
   */
  private generateInstallationId(purchaseCode: string): string {
    const data = [
      purchaseCode,
      new Date().getTime().toString(),
      Math.random().toString(36),
      ...this.securityKeys
    ].join('|');

    return createHash('sha256').update(data).digest('hex').substring(0, 32);
  }

  /**
   * Generate security key if not provided
   */
  private generateSecurityKey(): string {
    return createHash('sha256')
      .update(Math.random().toString(36) + Date.now().toString())
      .digest('hex');
  }

  /**
   * Get default installation state
   */
  private getDefaultState(): InstallationState {
    return {
      isInstalled: false,
      version: '1.0.0'
    };
  }

  /**
   * Save installation state to file (Node.js only)
   */
  private saveState(state: InstallationState): void {
    if (!this.canAccessFileSystem()) {
      return;
    }

    const fs = require('fs');
    fs.writeFileSync(this.configPath, JSON.stringify(state, null, 2), 'utf-8');
  }

  /**
   * Create lock file for additional security (Node.js only)
   */
  private createLockFile(state: InstallationState): void {
    if (!this.canAccessFileSystem()) {
      return;
    }

    const lockData = {
      installationId: state.installationId,
      hash: this.generateLockHash(state),
      timestamp: Date.now()
    };

    const fs = require('fs');
    fs.writeFileSync(this.lockPath, JSON.stringify(lockData), 'utf-8');
  }

  /**
   * Generate hash for lock file
   */
  private generateLockHash(state: InstallationState): string {
    const data = [
      state.installationId,
      state.purchaseCodeHash,
      state.siteName,
      ...this.securityKeys
    ].join('|');

    return createHash('sha256').update(data).digest('hex');
  }
}

// Export singleton instance
export const installationManager = InstallationManager.getInstance();