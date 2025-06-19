/**
 * Cryptographic Utilities for OAuth Module
 * Handles encryption, hashing, and secure token generation
 */

const crypto = require('crypto');

class CryptoUtils {
  constructor(encryptionKey = null) {
    // Use provided key or generate from environment variable
    this.encryptionKey = encryptionKey || 
                        process.env.OAUTH_ENCRYPTION_KEY || 
                        this.generateEncryptionKey();
    
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
  }

  /**
   * Generate a secure encryption key
   */
  generateEncryptionKey() {
    console.warn('⚠️  No OAUTH_ENCRYPTION_KEY found, generating temporary key. Set OAUTH_ENCRYPTION_KEY in environment for production!');
    return crypto.randomBytes(this.keyLength);
  }

  /**
   * Encrypt sensitive data (like OAuth tokens)
   */
  encrypt(text) {
    try {
      if (!text) return null;
      
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
      cipher.setAAD(Buffer.from('oauth-token', 'utf8'));
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Combine IV, tag, and encrypted data
      return {
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        encrypted: encrypted
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData) {
    try {
      if (!encryptedData || typeof encryptedData !== 'object') {
        return null;
      }
      
      const { iv, tag, encrypted } = encryptedData;
      
      const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
      decipher.setAAD(Buffer.from('oauth-token', 'utf8'));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Simple encrypt for backwards compatibility
   */
  encryptSimple(text) {
    try {
      if (!text) return null;
      
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Simple encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Simple decrypt for backwards compatibility
   */
  decryptSimple(encryptedText) {
    try {
      if (!encryptedText || typeof encryptedText !== 'string') {
        return null;
      }
      
      const [ivHex, encrypted] = encryptedText.split(':');
      if (!ivHex || !encrypted) {
        throw new Error('Invalid encrypted data format');
      }
      
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Simple decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Generate secure random state parameter for OAuth
   */
  generateState(length = 32) {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Generate PKCE code verifier
   */
  generateCodeVerifier(length = 32) {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Generate PKCE code challenge from verifier
   */
  generateCodeChallenge(verifier) {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  /**
   * Hash password or sensitive data
   */
  hash(data, salt = null) {
    const saltToUse = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, saltToUse, 10000, 64, 'sha256').toString('hex');
    
    return {
      hash: hash,
      salt: saltToUse
    };
  }

  /**
   * Verify hashed data
   */
  verifyHash(data, hash, salt) {
    const newHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha256').toString('hex');
    return newHash === hash;
  }

  /**
   * Generate secure random token
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate UUID v4
   */
  generateUUID() {
    return crypto.randomUUID();
  }

  /**
   * Create HMAC signature
   */
  createSignature(data, secret = null) {
    const secretToUse = secret || this.encryptionKey;
    return crypto.createHmac('sha256', secretToUse).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verifySignature(data, signature, secret = null) {
    const secretToUse = secret || this.encryptionKey;
    const expectedSignature = crypto.createHmac('sha256', secretToUse).update(data).digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Generate secure session ID
   */
  generateSessionId() {
    return this.generateToken(48);
  }

  /**
   * Generate CSRF token
   */
  generateCSRFToken() {
    return this.generateToken(24);
  }

  /**
   * Constant time string comparison to prevent timing attacks
   */
  constantTimeCompare(str1, str2) {
    if (str1.length !== str2.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(
      Buffer.from(str1, 'utf8'),
      Buffer.from(str2, 'utf8')
    );
  }

  /**
   * Mask sensitive data for logging
   */
  maskSensitiveData(data, visibleChars = 4) {
    if (!data || typeof data !== 'string') {
      return '[HIDDEN]';
    }
    
    if (data.length <= visibleChars * 2) {
      return '[HIDDEN]';
    }
    
    const start = data.substring(0, visibleChars);
    const end = data.substring(data.length - visibleChars);
    const masked = '*'.repeat(data.length - visibleChars * 2);
    
    return `${start}${masked}${end}`;
  }

  /**
   * Generate fingerprint for request/device identification
   */
  generateFingerprint(userAgent, ip, additionalData = {}) {
    const data = JSON.stringify({
      userAgent: userAgent || '',
      ip: ip || '',
      ...additionalData,
      timestamp: Math.floor(Date.now() / (1000 * 60 * 60)) // Hour precision
    });
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Secure random number generation
   */
  randomInt(min, max) {
    const range = max - min + 1;
    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    const maxValue = Math.pow(256, bytesNeeded);
    const threshold = maxValue - (maxValue % range);
    
    let randomBytes;
    do {
      randomBytes = crypto.randomBytes(bytesNeeded);
      const randomValue = randomBytes.readUIntBE(0, bytesNeeded);
      if (randomValue < threshold) {
        return min + (randomValue % range);
      }
    } while (true);
  }

  /**
   * Generate OTP (One-Time Password)
   */
  generateOTP(length = 6) {
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += this.randomInt(0, 9).toString();
    }
    return otp;
  }

  /**
   * Time-based OTP (TOTP) generation
   */
  generateTOTP(secret, timeStep = 30, digits = 6) {
    const time = Math.floor(Date.now() / 1000 / timeStep);
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeUInt32BE(0, 0);
    timeBuffer.writeUInt32BE(time, 4);
    
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base32'));
    hmac.update(timeBuffer);
    const hash = hmac.digest();
    
    const offset = hash[hash.length - 1] & 0x0f;
    const code = ((hash[offset] & 0x7f) << 24) |
                 ((hash[offset + 1] & 0xff) << 16) |
                 ((hash[offset + 2] & 0xff) << 8) |
                 (hash[offset + 3] & 0xff);
    
    return (code % Math.pow(10, digits)).toString().padStart(digits, '0');
  }
}

// Export singleton instance
const cryptoUtils = new CryptoUtils();

module.exports = {
  CryptoUtils,
  cryptoUtils,
  
  // Convenience functions
  encrypt: (text) => cryptoUtils.encrypt(text),
  decrypt: (encryptedData) => cryptoUtils.decrypt(encryptedData),
  encryptSimple: (text) => cryptoUtils.encryptSimple(text),
  decryptSimple: (encryptedText) => cryptoUtils.decryptSimple(encryptedText),
  generateState: (length) => cryptoUtils.generateState(length),
  generateCodeVerifier: (length) => cryptoUtils.generateCodeVerifier(length),
  generateCodeChallenge: (verifier) => cryptoUtils.generateCodeChallenge(verifier),
  generateToken: (length) => cryptoUtils.generateToken(length),
  generateUUID: () => cryptoUtils.generateUUID(),
  hash: (data, salt) => cryptoUtils.hash(data, salt),
  verifyHash: (data, hash, salt) => cryptoUtils.verifyHash(data, hash, salt),
  createSignature: (data, secret) => cryptoUtils.createSignature(data, secret),
  verifySignature: (data, signature, secret) => cryptoUtils.verifySignature(data, signature, secret),
  maskSensitiveData: (data, visibleChars) => cryptoUtils.maskSensitiveData(data, visibleChars),
  constantTimeCompare: (str1, str2) => cryptoUtils.constantTimeCompare(str1, str2)
};