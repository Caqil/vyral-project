// Create: apps/web/src/app/api/debug/modules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ModuleManager } from '@vyral/core';

const moduleManager = new ModuleManager();

export async function GET(request: NextRequest) {
  try {
    // Get all modules from database
    const modules = await moduleManager.getAvailableModules();
    
    // Get active module instances
    const activeModuleInstances = Array.from((moduleManager as any).activeModules.keys());
    
    // Get registered routes (access the private property)
    const registeredRoutes = Array.from((moduleManager as any).registeredRoutes?.keys() || []);
    
    // Check specific route
    const helloRoute = moduleManager.getRegisteredRoute('GET', '/api/hello');
    
    // Try to get the active module instance details
    const activeModuleDetails = activeModuleInstances.map(key => {
      const instance = (moduleManager as any).activeModules.get(key);
      return {
        key,
        hasInstance: !!instance,
        instanceType: instance?.constructor?.name,
        instanceMethods: instance ? Object.getOwnPropertyNames(Object.getPrototypeOf(instance)) : []
      };
    });
    
    return NextResponse.json({
      debug: {
        modulesInDatabase: modules.map(m => ({
          id: m.id,
          slug: m.manifest.slug,
          name: m.manifest.name,
          status: m.status,
          hasApiRoutes: !!m.manifest.apiRoutes?.length,
          apiRoutes: m.manifest.apiRoutes
        })),
        activeModuleInstances,
        activeModuleDetails,
        registeredRoutes,
        totalRegisteredRoutes: registeredRoutes.length,
        helloRouteExists: !!helloRoute,
        helloRoute: helloRoute ? 'Found' : 'Not found'
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      debug: 'Failed to get debug info'
    }, { status: 500 });
  }
}