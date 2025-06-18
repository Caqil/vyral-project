// apps/web/src/app/api/install/verify-purchase/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { installationManager } from '@/lib/installation';
import { createHash } from 'crypto';
import { headers } from 'next/headers';

interface CodeCanyonResponse {
  success: boolean;
  item: {
    id: string;
    name: string;
    description: string;
    site: string;
    classification: string;
    price_cents: number;
    number_of_sales: number;
    author_username: string;
    author_url: string;
    author_image: string;
    summary: string;
    rating: {
      rating: number;
      count: number;
    };
    created_at: string;
    updated_at: string;
    tags: string[];
    category: string;
    live_preview_url: string;
  };
  amount: string;
  sold_at: string;
  license: string;
  support_amount: string;
  supported_until: string;
  buyer: string;
  purchase_count: number;
}

interface VerificationResult {
  success: boolean;
  message: string;
  data?: {
    item: {
      name: string;
      author: string;
      purchaseDate: string;
      license: string;
      buyer: string;
    };
    installationId: string;
  };
  error?: string;
}

// Your CodeCanyon item configuration
const CODECANYON_CONFIG = {
  itemId: process.env.CODECANYON_ITEM_ID || '45678901', // Your actual item ID
  apiKey: process.env.CODECANYON_API_KEY || '', // Your Envato API key
  itemName: 'Vyral CMS - Modern WordPress Alternative',
  authorUsername: process.env.CODECANYON_AUTHOR || 'your-username'
};

export async function POST(request: NextRequest) {
  try {
    // Check if already installed
    if (installationManager.isInstalled()) {
      return NextResponse.json({
        success: false,
        message: 'System is already installed',
        error: 'ALREADY_INSTALLED'
      }, { status: 400 });
    }

    // Security check - verify request origin
    const headersList = headers();
    const origin = (await headersList).get('origin');
    const referer = (await headersList).get('referer');
    const userAgent = (await headersList).get('user-agent');

    // Basic bot detection
    if (!userAgent || userAgent.includes('curl') || userAgent.includes('wget')) {
      return NextResponse.json({
        success: false,
        message: 'Invalid request origin',
        error: 'INVALID_REQUEST'
      }, { status: 403 });
    }

    const body = await request.json();
    const { purchaseCode, clientFingerprint } = body;

    // Validate input
    if (!purchaseCode || typeof purchaseCode !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'Purchase code is required',
        error: 'MISSING_PURCHASE_CODE'
      }, { status: 400 });
    }

    // Validate purchase code format
    if (!installationManager.validatePurchaseCodeFormat(purchaseCode)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid purchase code format',
        error: 'INVALID_FORMAT'
      }, { status: 400 });
    }

    // Check if purchase code is already used
    if (installationManager.isPurchaseCodeUsed(purchaseCode)) {
      return NextResponse.json({
        success: false,
        message: 'This purchase code has already been used for installation',
        error: 'ALREADY_USED'
      }, { status: 400 });
    }

    // Verify with CodeCanyon API
    const verificationResult = await verifyWithCodeCanyon(purchaseCode);
    
    if (!verificationResult.success) {
      return NextResponse.json(verificationResult, { status: 400 });
    }

    // Generate installation ID and prepare response
    const installationId = generateInstallationId(purchaseCode);
    
    // Store verified purchase code temporarily (will be finalized during installation)
    installationManager.setState({
      purchaseCode,
      installationId
    });

    return NextResponse.json({
      success: true,
      message: 'Purchase code verified successfully',
      data: {
        item: verificationResult.data!.item,
        installationId
      }
    });

  } catch (error) {
    console.error('Purchase verification error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'An error occurred during verification',
      error: 'SERVER_ERROR'
    }, { status: 500 });
  }
}

async function verifyWithCodeCanyon(purchaseCode: string): Promise<VerificationResult> {
  if (!CODECANYON_CONFIG.apiKey) {
    // Fallback verification for development/testing
    if (process.env.NODE_ENV === 'development') {
      return simulateCodeCanyonVerification(purchaseCode);
    }
    
    return {
      success: false,
      message: 'API configuration error',
      error: 'CONFIG_ERROR'
    };
  }

  try {
    // Envato API endpoint for purchase verification
    const apiUrl = `https://api.envato.com/v3/market/author/sale`;
    const headers = {
      'Authorization': `Bearer ${CODECANYON_CONFIG.apiKey}`,
      'User-Agent': 'Vyral CMS Installation Verification'
    };

    // First, get the sale information
    const response = await fetch(`${apiUrl}?code=${purchaseCode}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          message: 'Invalid purchase code. Please check your code and try again.',
          error: 'INVALID_PURCHASE_CODE'
        };
      }
      
      if (response.status === 403) {
        return {
          success: false,
          message: 'API access denied. Please contact support.',
          error: 'API_ACCESS_DENIED'
        };
      }

      throw new Error(`API request failed: ${response.status}`);
    }

    const data: CodeCanyonResponse = await response.json();

    // Verify this is for our item
    if (data.item.id !== CODECANYON_CONFIG.itemId) {
      return {
        success: false,
        message: 'This purchase code is not for Vyral CMS',
        error: 'WRONG_ITEM'
      };
    }

    // Check if license is valid
    if (data.license !== 'regular' && data.license !== 'extended') {
      return {
        success: false,
        message: 'Invalid license type',
        error: 'INVALID_LICENSE'
      };
    }

    // Additional security: Check if purchase is recent enough (prevent old nulled codes)
    const purchaseDate = new Date(data.sold_at);
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - 12); // Allow up to 12 months old

    if (purchaseDate < monthsAgo) {
      return {
        success: false,
        message: 'Purchase code is too old. Please contact support for assistance.',
        error: 'PURCHASE_TOO_OLD'
      };
    }

    return {
      success: true,
      message: 'Purchase verified successfully',
      data: {
        item: {
          name: data.item.name,
          author: data.item.author_username,
          purchaseDate: data.sold_at,
          license: data.license,
          buyer: data.buyer
        },
        installationId: generateInstallationId(purchaseCode)
      }
    };

  } catch (error) {
    console.error('CodeCanyon API error:', error);
    
    return {
      success: false,
      message: 'Unable to verify purchase code. Please check your internet connection and try again.',
      error: 'VERIFICATION_FAILED'
    };
  }
}

// Fallback for development environment
function simulateCodeCanyonVerification(purchaseCode: string): VerificationResult {
  // Development test codes
  const validTestCodes = [
    '12345678-1234-1234-1234-123456789012',
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'test-test-test-test-testtesttest'
  ];

  if (!validTestCodes.includes(purchaseCode.toLowerCase())) {
    return {
      success: false,
      message: 'Invalid test purchase code for development',
      error: 'INVALID_PURCHASE_CODE'
    };
  }

  return {
    success: true,
    message: 'Development purchase code verified',
    data: {
      item: {
        name: CODECANYON_CONFIG.itemName,
        author: CODECANYON_CONFIG.authorUsername,
        purchaseDate: new Date().toISOString(),
        license: 'regular',
        buyer: 'Development User'
      },
      installationId: generateInstallationId(purchaseCode)
    }
  };
}

function generateInstallationId(purchaseCode: string): string {
  const data = [
    purchaseCode,
    Date.now().toString(),
    Math.random().toString(36),
    process.env.NEXTAUTH_SECRET || 'fallback'
  ].join('|');

  return createHash('sha256').update(data).digest('hex').substring(0, 32);
}

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitStore.get(ip);

  if (!limit || now > limit.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + 300000 }); // 5 minutes
    return true;
  }

  if (limit.count >= 5) { // Max 5 attempts per 5 minutes
    return false;
  }

  limit.count++;
  return true;
}