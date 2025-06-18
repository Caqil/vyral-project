
import crypto from 'crypto';
import axios from 'axios';

interface LicenseConfig {
  purchaseCode: string;
  domain: string;
  email: string;
  activatedAt?: Date;
  lastVerified?: Date;
  fingerprint?: string;
}

interface EnvatoResponse {
  buyer: string;
  licence: string;
  item: {
    id: string;
    name: string;
    author_username: string;
  };
  purchase_date: string;
  wordpress_theme_metadata?: any;
}

export class LicenseManager {
  private static instance: LicenseManager;
  private readonly ENVATO_API_BASE = 'https://api.envato.com/v3/market';
  private readonly LICENSE_FILE = process.cwd() + '/.license';
  private readonly ITEM_ID = process.env.CODECANYON_ITEM_ID;
  private readonly SECRET_KEY = process.env.LICENSE_SECRET_KEY || 'your-secret-key-here';
  
  private constructor() {}

  public static getInstance(): LicenseManager {
    if (!LicenseManager.instance) {
      LicenseManager.instance = new LicenseManager();
    }
    return LicenseManager.instance;
  }

  /**
   * Verify purchase code with Envato API
   */
  public async verifyPurchaseCode(
    purchaseCode: string, 
    personalToken: string
  ): Promise<{ valid: boolean; data?: EnvatoResponse; error?: string }> {
    try {
      // Validate format first
      if (!this.isValidPurchaseCodeFormat(purchaseCode)) {
        return { valid: false, error: 'Invalid purchase code format' };
      }

      const response = await axios.get(
        `${this.ENVATO_API_BASE}/author/sale`,
        {
          headers: {
            'Authorization': `Bearer ${personalToken}`,
            'User-Agent': 'Mozilla/5.0 (compatible; Envato API Client)'
          },
          params: {
            code: purchaseCode
          },
          timeout: 10000
        }
      );

      const data = response.data;
      
      // Verify it's for our item
      if (data.item?.id !== this.ITEM_ID) {
        return { valid: false, error: 'Purchase code is not for this item' };
      }

      return { valid: true, data };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return { valid: false, error: 'Invalid purchase code' };
      }
      return { valid: false, error: 'Failed to verify purchase code' };
    }
  }

  /**
   * Activate license for current domain
   */
  public async activateLicense(
    purchaseCode: string,
    email: string,
    personalToken: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First verify the purchase code
      const verification = await this.verifyPurchaseCode(purchaseCode, personalToken);
      if (!verification.valid) {
        return { success: false, error: verification.error };
      }

      const currentDomain = this.getCurrentDomain();
      const fingerprint = this.generateFingerprint();

      // Check if already activated on another domain
      const existingLicense = await this.getExistingLicense(purchaseCode);
      if (existingLicense && existingLicense.domain !== currentDomain) {
        return { 
          success: false, 
          error: `License already activated on domain: ${existingLicense.domain}` 
        };
      }

      const licenseConfig: LicenseConfig = {
        purchaseCode: this.encrypt(purchaseCode),
        domain: currentDomain,
        email: this.encrypt(email),
        activatedAt: new Date(),
        lastVerified: new Date(),
        fingerprint
      };

      // Save license locally
      await this.saveLicense(licenseConfig);

      // Register with our verification server
      await this.registerLicense(purchaseCode, currentDomain, email);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify current license status
   */
  public async verifyLicense(): Promise<{ valid: boolean; error?: string }> {
    try {
      const license = await this.loadLicense();
      if (!license) {
        return { valid: false, error: 'No license found' };
      }

      const currentDomain = this.getCurrentDomain();
      const currentFingerprint = this.generateFingerprint();

      // Check domain match
      if (license.domain !== currentDomain) {
        return { valid: false, error: 'License domain mismatch' };
      }

      // Check fingerprint (anti-tampering)
      if (license.fingerprint !== currentFingerprint) {
        return { valid: false, error: 'License fingerprint mismatch' };
      }

      // Check if verification is needed (every 24 hours)
      const shouldVerify = !license.lastVerified || 
        (Date.now() - license.lastVerified.getTime()) > 24 * 60 * 60 * 1000;

      if (shouldVerify) {
        const remoteVerification = await this.verifyWithServer(
          this.decrypt(license.purchaseCode),
          license.domain
        );
        
        if (!remoteVerification.valid) {
          return { valid: false, error: remoteVerification.error };
        }

        // Update last verified
        license.lastVerified = new Date();
        await this.saveLicense(license);
      }

      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Deactivate current license
   */
  public async deactivateLicense(): Promise<{ success: boolean; error?: string }> {
    try {
      const license = await this.loadLicense();
      if (!license) {
        return { success: false, error: 'No license to deactivate' };
      }

      // Deregister from server
      await this.deregisterLicense(
        this.decrypt(license.purchaseCode),
        license.domain
      );

      // Remove local license
      await this.removeLicense();

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get license info
   */
  public async getLicenseInfo(): Promise<LicenseConfig | null> {
    try {
      const license = await this.loadLicense();
      if (!license) return null;

      return {
        ...license,
        purchaseCode: '****-****-****-' + this.decrypt(license.purchaseCode).slice(-4),
        email: this.decrypt(license.email)
      };
    } catch {
      return null;
    }
  }

  // Private helper methods
  private isValidPurchaseCodeFormat(code: string): boolean {
    return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(code);
  }

  private getCurrentDomain(): string {
    return process.env.DOMAIN || 
           process.env.VERCEL_URL || 
           process.env.NEXT_PUBLIC_SITE_URL || 
           'localhost';
  }

  private generateFingerprint(): string {
    const data = [
      process.cwd(),
      process.env.NODE_ENV,
      process.platform,
      process.arch,
      this.getCurrentDomain()
    ].join('|');
    
    return crypto.createHmac('sha256', this.SECRET_KEY)
                 .update(data)
                 .digest('hex');
  }

  private encrypt(text: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', this.SECRET_KEY);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private decrypt(encryptedText: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', this.SECRET_KEY);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private async saveLicense(license: LicenseConfig): Promise<void> {
    const fs = await import('fs/promises');
    const encrypted = this.encrypt(JSON.stringify(license));
    await fs.writeFile(this.LICENSE_FILE, encrypted);
  }

  private async loadLicense(): Promise<LicenseConfig | null> {
    try {
      const fs = await import('fs/promises');
      const encrypted = await fs.readFile(this.LICENSE_FILE, 'utf8');
      const decrypted = this.decrypt(encrypted);
      const license = JSON.parse(decrypted);
      
      // Convert date strings back to Date objects
      if (license.activatedAt) license.activatedAt = new Date(license.activatedAt);
      if (license.lastVerified) license.lastVerified = new Date(license.lastVerified);
      
      return license;
    } catch {
      return null;
    }
  }

  private async removeLicense(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      await fs.unlink(this.LICENSE_FILE);
    } catch {
      // Ignore if file doesn't exist
    }
  }

  private async getExistingLicense(purchaseCode: string): Promise<{ domain: string } | null> {
    try {
      // This would check your server for existing activations
      const response = await axios.post(`${process.env.LICENSE_SERVER_URL}/check`, {
        purchaseCode,
        itemId: this.ITEM_ID
      });
      return response.data.license;
    } catch {
      return null;
    }
  }

  private async registerLicense(purchaseCode: string, domain: string, email: string): Promise<void> {
    try {
      await axios.post(`${process.env.LICENSE_SERVER_URL}/register`, {
        purchaseCode,
        itemId: this.ITEM_ID,
        domain,
        email,
        timestamp: Date.now()
      });
    } catch (error) {
      throw new Error('Failed to register license with server');
    }
  }

  private async verifyWithServer(purchaseCode: string, domain: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await axios.post(`${process.env.LICENSE_SERVER_URL}/verify`, {
        purchaseCode,
        itemId: this.ITEM_ID,
        domain
      });
      return { valid: response.data.valid };
    } catch (error: any) {
      return { valid: false, error: 'Failed to verify with server' };
    }
  }

  private async deregisterLicense(purchaseCode: string, domain: string): Promise<void> {
    try {
      await axios.post(`${process.env.LICENSE_SERVER_URL}/deregister`, {
        purchaseCode,
        itemId: this.ITEM_ID,
        domain
      });
    } catch {
      // Ignore errors during deregistration
    }
  }
}

// License middleware for protecting routes
export const requireValidLicense = async (req: any, res: any, next: any) => {
  const licenseManager = LicenseManager.getInstance();
  const verification = await licenseManager.verifyLicense();
  
  if (!verification.valid) {
    return res.status(401).json({
      error: 'Invalid license',
      message: verification.error,
      redirectTo: '/setup/license'
    });
  }
  
  next();
};

// Setup wizard component integration
export const setupWizardConfig = {
  steps: [
    {
      id: 'license',
      title: 'License Activation',
      description: 'Activate your CodeCanyon license',
      required: true,
      component: 'LicenseActivation'
    },
    {
      id: 'database',
      title: 'Database Configuration',
      description: 'Configure your database connection',
      required: true,
      component: 'DatabaseSetup'
    },
    {
      id: 'admin',
      title: 'Admin Account',
      description: 'Create your admin account',
      required: true,
      component: 'AdminSetup'
    }
  ]
};