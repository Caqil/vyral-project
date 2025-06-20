import { NextRequest, NextResponse } from 'next/server';
import { ModuleManager } from '@vyral/core';
import { connectDB } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Manual module initialization started...');
    
    await connectDB();
    console.log('✅ Database connected');

    const moduleManager = new ModuleManager();
    
    // Get active modules first
    const activeModules = await moduleManager.getActiveModules();
    console.log(`📋 Found ${activeModules.length} active modules in database`);
    
    if (activeModules.length === 0) {
      return NextResponse.json({
        error: 'No active modules found in database',
        modules: []
      });
    }

    // Log each module before activation
    for (const module of activeModules) {
      console.log(`📦 Module: ${module.manifest.slug} (${module.status})`);
      console.log(`📁 Install path: ${module.installPath}`);
      console.log(`📄 Main file: ${module.manifest.main}`);
    }

    // Try to manually load each active module instead of using initializeInstalledModules
    const results: { module: string; status: string; error?: string }[] = [];
    for (const module of activeModules) {
      try {
        console.log(`🚀 Loading module: ${module.manifest.slug}`);
        
        // Load and instantiate module manually
        const ModuleClass = await (moduleManager as any).loadModuleClass(module);
        console.log(`✅ Module class loaded for ${module.manifest.slug}`);
        
        const moduleInstance = new ModuleClass(module.configValues);
        console.log(`✅ Module instance created for ${module.manifest.slug}`);
        
        // Initialize module
        if (typeof moduleInstance.initialize === 'function') {
          await moduleInstance.initialize();
          console.log(`✅ Module initialized: ${module.manifest.slug}`);
        }
        
        // Register API routes
        if (module.manifest.apiRoutes?.length) {
          await (moduleManager as any).registerApiRoutes(module.manifest, moduleInstance);
          console.log(`✅ API routes registered for ${module.manifest.slug}`);
        }
        
        // Store active module instance
        (moduleManager as any).activeModules.set(module.manifest.slug, moduleInstance);
        
        results.push({ module: module.manifest.slug, status: 'loaded' });
        
      } catch (error: any) {
        console.error(`❌ Failed to load ${module.manifest.slug}:`, error);
        results.push({ 
          module: module.manifest.slug, 
          status: 'error', 
          error: error.message 
        });
      }
    }

    // Check what was actually loaded
    const activeInstances = Array.from((moduleManager as any).activeModules.keys());
    const registeredRoutes = Array.from((moduleManager as any).registeredRoutes?.keys() || []);

    return NextResponse.json({
      success: true,
      message: 'Manual module loading completed',
      results,
      finalState: {
        activeInstances,
        registeredRoutes,
        totalRoutes: registeredRoutes.length
      }
    });

  } catch (error: any) {
    console.error('❌ Module initialization error:', error);
    
    return NextResponse.json({
      error: 'Module initialization failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}