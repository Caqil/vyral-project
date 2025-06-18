// apps/web/src/app/api/install/status/route.ts
import { NextResponse } from 'next/server';
import { installationManager } from '@/lib/installation';

export async function GET() {
  try {
    const isInstalled = installationManager.isInstalled();
    const state = installationManager.getState();
    
    return NextResponse.json({
      isInstalled,
      version: state.version,
      installedAt: state.installedAt,
      hasValidLicense: !!state.purchaseCodeHash
    });
  } catch (error) {
    console.error('Installation status check error:', error);
    
    return NextResponse.json({
      isInstalled: false,
      error: 'Unable to check installation status'
    }, { status: 500 });
  }
}

// Additional endpoint for health checks
export async function HEAD() {
  try {
    const isInstalled = installationManager.isInstalled();
    
    if (isInstalled) {
      return new NextResponse(null, { status: 200 });
    } else {
      return new NextResponse(null, { status: 503 }); // Service unavailable
    }
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}