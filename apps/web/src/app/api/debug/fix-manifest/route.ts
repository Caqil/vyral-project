// Create: apps/web/src/app/api/debug/fix-manifest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ModuleManager } from '@vyral/core';
import { connectDB } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Fixing manifest permissions in database...');
    
    await connectDB();
    const moduleManager = new ModuleManager();
    
    // Get the hello-world module
    const modules = await moduleManager.getAvailableModules();
    const helloModule = modules.find(m => m.manifest.slug === 'hello-world');
    
    if (!helloModule) {
      return NextResponse.json({
        error: 'Hello-world module not found'
      }, { status: 404 });
    }

    console.log('📋 Current apiRoutes permissions:', (helloModule.manifest.apiRoutes ?? []).map(r => r.permissions));
    
    // Create updated manifest with empty permissions
    const updatedManifest = {
      ...helloModule.manifest,
      apiRoutes: (helloModule.manifest.apiRoutes ?? []).map(route => ({
        ...route,
        permissions: [] // Remove all permissions
      }))
    };
    
    console.log('📋 New apiRoutes permissions:', updatedManifest.apiRoutes.map(r => r.permissions));
    
    // Deactivate first
    if (helloModule.status === 'active') {
      console.log('🛑 Deactivating module...');
      await moduleManager.deactivateModule(helloModule.id.toString(), 'system');
    }
    
    // Update the module record with corrected manifest
    await moduleManager.updateByIdOrThrow(helloModule.id, {
      manifest: updatedManifest,
      status: 'installed'
    });
    
    console.log('✅ Database manifest updated');
    
    // Activate again
    console.log('🚀 Reactivating module...');
    const reactivatedModule = await moduleManager.activateModule(helloModule.id.toString(), 'system');
    
    // Reset the catch-all route cache
    (global as any).moduleManager = null;
    (global as any).modulesInitialized = false;
    
    return NextResponse.json({
      success: true,
      message: 'Manifest permissions fixed and module reactivated',
      oldPermissions: (helloModule.manifest.apiRoutes ?? []).map(r => r.permissions),
      newPermissions: (updatedManifest.apiRoutes ?? []).map(r => r.permissions),
      moduleStatus: reactivatedModule.status
    });

  } catch (error: any) {
    console.error('❌ Manifest fix error:', error);
    
    return NextResponse.json({
      error: 'Manifest fix failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}