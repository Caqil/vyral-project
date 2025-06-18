
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that should be accessible during installation
const INSTALLATION_ROUTES = [
  '/install',
  '/install/verify',
  '/install/setup',
  '/install/complete',
  '/api/install',
  '/api/install/verify-purchase',
  '/api/install/setup',
  '/api/install/status'
];

// Static assets and API routes that should always be accessible
const ALWAYS_ACCESSIBLE = [
  '/_next',
  '/favicon.ico',
  '/images',
  '/icons',
  '/api/health',
  '/api/status'
];

// Admin routes that need special protection
const ADMIN_ROUTES = [
  '/admin',
  '/api/admin'
];

// Development routes (only in dev mode)
const DEV_ROUTES = [
  '/api/dev'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if system is installed using environment variable (Edge Runtime compatible)
  const isInstalled = process.env.VYRAL_INSTALLED === 'true';

  // Always allow static assets and basic API routes
  if (ALWAYS_ACCESSIBLE.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow dev routes only in development
  if (process.env.NODE_ENV === 'development' && 
      DEV_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // If not installed, handle installation flow
  if (!isInstalled) {
    return handleInstallationFlow(request);
  }

  // If installed, handle normal application flow
  return handleNormalFlow(request);
}

function handleInstallationFlow(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow installation routes
  if (INSTALLATION_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Block admin routes during installation
  if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
    return redirectToInstallation(request);
  }

  // Block all other routes and redirect to installation
  if (pathname !== '/install') {
    return redirectToInstallation(request);
  }

  return NextResponse.next();
}

function handleNormalFlow(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block access to installation routes after installation
  if (INSTALLATION_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Additional security checks for admin routes
  if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
    return handleAdminAccess(request);
  }

  return NextResponse.next();
}

function handleAdminAccess(request: NextRequest) {
  // Additional security headers for admin routes
  const response = NextResponse.next();
  
  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  return response;
}

function redirectToInstallation(request: NextRequest) {
  const installUrl = new URL('/install', request.url);
  
  // Preserve the original URL for after installation
  if (request.nextUrl.pathname !== '/') {
    installUrl.searchParams.set('redirect', request.nextUrl.pathname);
  }
  
  return NextResponse.redirect(installUrl);
}

// Anti-tampering checks
function verifyInstallationIntegrity(request: NextRequest): boolean {
  try {
    // Check for common tampering attempts
    const suspiciousHeaders = [
      'x-vyral-bypass',
      'x-install-override',
      'x-force-access'
    ];

    for (const header of suspiciousHeaders) {
      if (request.headers.get(header)) {
        console.warn(`Suspicious header detected: ${header}`);
        return false;
      }
    }

    // Check for suspicious query parameters
    const suspiciousParams = [
      'bypass_install',
      'force_access',
      'override_check'
    ];

    for (const param of suspiciousParams) {
      if (request.nextUrl.searchParams.has(param)) {
        console.warn(`Suspicious parameter detected: ${param}`);
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

// Rate limiting for installation attempts (Edge Runtime compatible)
const installAttempts = new Map<string, { count: number; lastAttempt: number }>();

function checkInstallRateLimit(request: NextRequest): boolean {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const attempts = installAttempts.get(ip);

  if (!attempts) {
    installAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }

  // Reset after 1 hour
  if (now - attempts.lastAttempt > 3600000) {
    installAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }

  // Max 10 installation attempts per hour
  if (attempts.count >= 10) {
    return false;
  }

  attempts.count++;
  attempts.lastAttempt = now;
  return true;
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

// Additional utility functions for enhanced security
export function generateCSRFToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

export function validateCSRFToken(token: string, storedToken: string): boolean {
  return token === storedToken;
}

// Content Security Policy for installation pages
export function getInstallationCSP(): string {
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