import { createHash, randomBytes } from 'crypto';
import { NextRequest } from 'next/server';

export class SecurityValidator {
  private static readonly SUSPICIOUS_PATTERNS = [
    /bypass/i,
    /override/i,
    /null/i,
    /crack/i,
    /hack/i,
    /exploit/i,
    /admin.*bypass/i,
    /force.*access/i,
    /skip.*install/i
  ];

  private static readonly BLOCKED_USER_AGENTS = [
    /curl/i,
    /wget/i,
    /python/i,
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i
  ];

  private static readonly SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };

  /**
   * Validate request for potential security threats
   */
  public static validateRequest(request: NextRequest): SecurityValidationResult {
    const issues: string[] = [];

    // Check user agent
    const userAgent = request.headers.get('user-agent') || '';
    if (this.isBlockedUserAgent(userAgent)) {
      issues.push('Blocked user agent detected');
    }

    // Check for suspicious patterns in URL
    const url = request.url;
    if (this.containsSuspiciousPattern(url)) {
      issues.push('Suspicious URL pattern detected');
    }

    // Check headers for tampering attempts
    const headerTampering = this.detectHeaderTampering(request);
    if (headerTampering.length > 0) {
      issues.push(...headerTampering);
    }

    // Check for common injection attempts
    const injectionAttempts = this.detectInjectionAttempts(request);
    if (injectionAttempts.length > 0) {
      issues.push(...injectionAttempts);
    }

    return {
      isValid: issues.length === 0,
      issues,
      riskScore: this.calculateRiskScore(issues)
    };
  }

  /**
   * Generate security token for installation
   */
  public static generateInstallationToken(): string {
    const timestamp = Date.now().toString();
    const randomData = randomBytes(16).toString('hex');
    const serverFingerprint = this.generateServerFingerprint();
    
    return createHash('sha256')
      .update(`${timestamp}:${randomData}:${serverFingerprint}`)
      .digest('hex');
  }

  /**
   * Validate installation token
   */
  public static validateInstallationToken(token: string, maxAge: number = 3600000): boolean {
    try {
      // In a real implementation, you'd store and validate tokens
      // For now, we'll check if it's a valid hex string
      return /^[a-f0-9]{64}$/.test(token);
    } catch {
      return false;
    }
  }

  /**
   * Generate anti-tampering checksum
   */
  public static generateTamperChecksum(data: any): string {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    const serverSecret = process.env.NEXTAUTH_SECRET || 'fallback-secret';
    
    return createHash('sha256')
      .update(dataString + serverSecret)
      .digest('hex');
  }

  /**
   * Verify anti-tampering checksum
   */
  public static verifyTamperChecksum(data: any, checksum: string): boolean {
    const expectedChecksum = this.generateTamperChecksum(data);
    return expectedChecksum === checksum;
  }

  /**
   * Create security headers for responses
   */
  public static getSecurityHeaders(): Record<string, string> {
    return { ...this.SECURITY_HEADERS };
  }

  /**
   * Check if user agent is blocked
   */
  private static isBlockedUserAgent(userAgent: string): boolean {
    return this.BLOCKED_USER_AGENTS.some(pattern => pattern.test(userAgent));
  }

  /**
   * Check for suspicious patterns
   */
  private static containsSuspiciousPattern(text: string): boolean {
    return this.SUSPICIOUS_PATTERNS.some(pattern => pattern.test(text));
  }

  /**
   * Detect header tampering attempts
   */
  private static detectHeaderTampering(request: NextRequest): string[] {
    const issues: string[] = [];
    const suspiciousHeaders = [
      'x-install-bypass',
      'x-force-install',
      'x-skip-verification',
      'x-override-check',
      'x-admin-bypass',
      'x-null-license'
    ];

    for (const header of suspiciousHeaders) {
      if (request.headers.get(header)) {
        issues.push(`Suspicious header detected: ${header}`);
      }
    }

    return issues;
  }

  /**
   * Detect injection attempts
   */
  private static detectInjectionAttempts(request: NextRequest): string[] {
    const issues: string[] = [];
    const url = request.url;

    // SQL injection patterns
    const sqlPatterns = [
      /union.*select/i,
      /drop.*table/i,
      /insert.*into/i,
      /delete.*from/i,
      /update.*set/i,
      /exec.*sp_/i
    ];

    // XSS patterns
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /alert\s*\(/i
    ];

    // Check for SQL injection
    if (sqlPatterns.some(pattern => pattern.test(url))) {
      issues.push('SQL injection attempt detected');
    }

    // Check for XSS
    if (xssPatterns.some(pattern => pattern.test(url))) {
      issues.push('XSS attempt detected');
    }

    return issues;
  }

  /**
   * Calculate risk score based on issues
   */
  private static calculateRiskScore(issues: string[]): number {
    let score = 0;

    for (const issue of issues) {
      if (issue.includes('injection')) score += 10;
      else if (issue.includes('bypass')) score += 8;
      else if (issue.includes('suspicious')) score += 5;
      else if (issue.includes('blocked')) score += 3;
      else score += 1;
    }

    return Math.min(score, 10); // Cap at 10
  }

  /**
   * Generate server fingerprint
   */
  private static generateServerFingerprint(): string {
    const factors = [
      process.env.HOSTNAME || 'localhost',
      process.env.NODE_ENV || 'development',
      process.platform,
      process.version
    ];

    return createHash('md5')
      .update(factors.join('|'))
      .digest('hex');
  }
}

export interface SecurityValidationResult {
  isValid: boolean;
  issues: string[];
  riskScore: number;
}

/**
 * Rate limiter for installation attempts
 */
export class InstallationRateLimiter {
  private static attempts = new Map<string, AttemptRecord>();
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private static readonly LOCKOUT_MS = 60 * 60 * 1000; // 1 hour

  public static checkRateLimit(identifier: string): RateLimitResult {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record) {
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
        lockedUntil: null
      });
      return { allowed: true, remaining: this.MAX_ATTEMPTS - 1 };
    }

    // Check if locked out
    if (record.lockedUntil && now < record.lockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        lockoutEndsAt: record.lockedUntil
      };
    }

    // Reset if window expired
    if (now - record.firstAttempt > this.WINDOW_MS) {
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
        lockedUntil: null
      });
      return { allowed: true, remaining: this.MAX_ATTEMPTS - 1 };
    }

    // Increment count
    record.count++;
    record.lastAttempt = now;

    if (record.count > this.MAX_ATTEMPTS) {
      record.lockedUntil = now + this.LOCKOUT_MS;
      return {
        allowed: false,
        remaining: 0,
        lockoutEndsAt: record.lockedUntil
      };
    }

    return {
      allowed: true,
      remaining: this.MAX_ATTEMPTS - record.count
    };
  }

  public static reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  lockoutEndsAt?: number;
}

/**
 * Installation integrity checker
 */
export class IntegrityChecker {
  private static readonly CRITICAL_FILES = [
    'package.json',
    '.vyral-install.json',
    '.vyral-lock'
  ];

  public static async checkSystemIntegrity(): Promise<IntegrityResult> {
    const issues: string[] = [];

    try {
      // Check for file tampering
      const fileIntegrity = await this.checkFileIntegrity();
      if (!fileIntegrity.valid) {
        issues.push(...fileIntegrity.issues);
      }

      // Check environment integrity
      const envIntegrity = this.checkEnvironmentIntegrity();
      if (!envIntegrity.valid) {
        issues.push(...envIntegrity.issues);
      }

      // Check for common bypassing attempts
      const bypassAttempts = this.detectBypassAttempts();
      if (bypassAttempts.length > 0) {
        issues.push(...bypassAttempts);
      }

      return {
        valid: issues.length === 0,
        issues,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        valid: false,
        issues: ['System integrity check failed'],
        timestamp: new Date().toISOString()
      };
    }
  }

  private static async checkFileIntegrity(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    // In a real implementation, you'd check file hashes
    // For now, we'll just check if critical files exist
    for (const file of this.CRITICAL_FILES) {
      try {
        const { existsSync } = await import('fs');
        if (!existsSync(file)) {
          issues.push(`Critical file missing: ${file}`);
        }
      } catch {
        // File system access may be restricted
      }
    }

    return { valid: issues.length === 0, issues };
  }

  private static checkEnvironmentIntegrity(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for environment manipulation
    const suspiciousEnvVars = [
      'VYRAL_BYPASS_INSTALL',
      'SKIP_VERIFICATION',
      'FORCE_INSTALL',
      'DISABLE_LICENSE_CHECK'
    ];

    for (const envVar of suspiciousEnvVars) {
      if (process.env[envVar]) {
        issues.push(`Suspicious environment variable: ${envVar}`);
      }
    }

    return { valid: issues.length === 0, issues };
  }

  private static detectBypassAttempts(): string[] {
    const issues: string[] = [];

    // Check for common nulling attempts
    const nullingIndicators = [
      'null',
      'nulled',
      'cracked',
      'free',
      'leaked'
    ];

    // Check command line arguments
    const args = process.argv.join(' ').toLowerCase();
    for (const indicator of nullingIndicators) {
      if (args.includes(indicator)) {
        issues.push(`Nulling attempt detected: ${indicator}`);
      }
    }

    return issues;
  }
}

interface IntegrityResult {
  valid: boolean;
  issues: string[];
  timestamp: string;
}