// apps/web/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Static assets and API routes that should always be accessible
const ALWAYS_ACCESSIBLE = [
  '/_next',
  '/favicon.ico',
  '/images',
  '/icons',
  '/api/health',
  '/api/status',
  '/api/auto-seed',
  '/api/auth', // NextAuth API routes
];

// Admin routes that need authentication
const ADMIN_ROUTES = [
  '/admin',
  '/api/admin'
];

// Development routes (only in dev mode)
const DEV_ROUTES = [
  '/api/dev'
];

// Public routes (no auth required)
const PUBLIC_ROUTES = [
  '/',
  '/auth',
  '/blog',
  '/post',
  '/about',
  '/contact'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Always allow static assets and basic API routes
  if (ALWAYS_ACCESSIBLE.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow dev routes only in development
  if (process.env.NODE_ENV === 'development' && 
      DEV_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Handle admin routes with authentication
  if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
    return await handleAdminAccess(request);
  }

  // Handle all other routes normally
  return handleNormalFlow(request);
}

async function handleAdminAccess(request: NextRequest) {
  try {
    // Check for valid session token
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    // If no token, redirect to signin
    if (!token) {
      console.log('🔒 No token found, redirecting to signin');
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(signInUrl);
    }

    // Check if user has admin role
    const allowedRoles = ['super_admin', 'admin', 'editor'];
    if (!token.role || !allowedRoles.includes(token.role as string)) {
      console.log(`🚫 User role '${token.role}' not allowed for admin access`);
      return NextResponse.redirect(new URL('/', request.url));
    }

    console.log(`✅ Admin access granted for user: ${token.email} (${token.role})`);

    // Enhanced security headers for admin routes
    const response = NextResponse.next();
    
    // Add strict security headers for admin
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // Add Content Security Policy for admin pages
    response.headers.set('Content-Security-Policy', getAdminCSP());
    
    // Check for suspicious headers or parameters
    if (!verifyRequestIntegrity(request)) {
      console.warn('⚠️ Suspicious admin access attempt blocked');
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // Check rate limiting for admin routes
    if (!checkAdminRateLimit(request)) {
      console.warn('⚠️ Admin rate limit exceeded');
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }
    
    return response;

  } catch (error) {
    console.error('❌ Error in admin middleware:', error);
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(signInUrl);
  }
}

function handleNormalFlow(request: NextRequest) {
  // Add basic security headers for all routes
  const response = NextResponse.next();
  
  // Add general security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  return response;
}

// Anti-tampering checks
function verifyRequestIntegrity(request: NextRequest): boolean {
  try {
    // Check for common tampering attempts
    const suspiciousHeaders = [
      'x-vyral-bypass',
      'x-admin-override',
      'x-force-access',
      'x-bypass-auth',
      'x-skip-check'
    ];

    for (const header of suspiciousHeaders) {
      if (request.headers.get(header)) {
        console.warn(`⚠️ Suspicious header detected: ${header}`);
        return false;
      }
    }

    // Check for suspicious query parameters
    const suspiciousParams = [
      'bypass_auth',
      'force_access',
      'override_check',
      'admin_bypass',
      'skip_auth'
    ];

    for (const param of suspiciousParams) {
      if (request.nextUrl.searchParams.has(param)) {
        console.warn(`⚠️ Suspicious parameter detected: ${param}`);
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

// Rate limiting for admin routes (Edge Runtime compatible)
const adminAttempts = new Map<string, { count: number; lastAttempt: number }>();

function checkAdminRateLimit(request: NextRequest): boolean {
  const ip = request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown';
  const now = Date.now();
  const attempts = adminAttempts.get(ip);

  if (!attempts) {
    adminAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }

  // Reset after 15 minutes
  if (now - attempts.lastAttempt > 900000) {
    adminAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }

  // Max 100 admin requests per 15 minutes
  if (attempts.count >= 100) {
    return false;
  }

  attempts.count++;
  attempts.lastAttempt = now;
  return true;
}

// Content Security Policy for admin pages
function getAdminCSP(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
}

// Clean up old rate limit entries periodically
function cleanupRateLimitMap() {
  const now = Date.now();
  const cutoff = now - 900000; // 15 minutes
  
  for (const [ip, data] of adminAttempts.entries()) {
    if (data.lastAttempt < cutoff) {
      adminAttempts.delete(ip);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof globalThis !== 'undefined') {
  setInterval(cleanupRateLimitMap, 300000);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};

// Utility functions for enhanced security
export function generateCSRFToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

export function validateCSRFToken(token: string, storedToken: string): boolean {
  return token === storedToken;
}

// Utility to check if request is from localhost (for development)
export function isLocalhost(request: NextRequest): boolean {
  const host = request.headers.get('host') || '';
  return host.includes('localhost') || host.includes('127.0.0.1');
}