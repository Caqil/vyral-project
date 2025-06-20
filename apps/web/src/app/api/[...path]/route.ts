import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ModuleManager } from '@vyral/core';
import { requirePermission } from '@/lib/permissions';
import { connectDB } from '@/lib/db';
import path from 'path';

// Global module manager instance
let moduleManager: ModuleManager | null = null;
let modulesInitialized = false;

async function getModuleManager(): Promise<ModuleManager> {
  if (!moduleManager) {
    moduleManager = new ModuleManager();
  }
  
  // Ensure modules are loaded
  if (!modulesInitialized) {
    try {
      console.log('🔄 Auto-loading modules in catch-all route...');
      await connectDB();
      
      // Get active modules and load them manually
      const activeModules = await moduleManager.getActiveModules();
      
      for (const module of activeModules) {
        try {
          // Load and instantiate module manually (same as debug/init-modules)
          const ModuleClass = await (moduleManager as any).loadModuleClass(module);
          const moduleInstance = new ModuleClass(module.configValues);
          
          // Initialize module
          if (typeof moduleInstance.initialize === 'function') {
            await moduleInstance.initialize();
          }
          
          // Register API routes
          if (module.manifest.apiRoutes?.length) {
            await (moduleManager as any).registerApiRoutes(module.manifest, moduleInstance);
          }
          
          // Store active module instance
          (moduleManager as any).activeModules.set(module.manifest.slug, moduleInstance);
          
          console.log(`✅ Auto-loaded module: ${module.manifest.slug}`);
        } catch (error) {
          console.error(`❌ Failed to auto-load module ${module.manifest.slug}:`, error);
        }
      }
      
      modulesInitialized = true;
      console.log('✅ Auto-loading completed');
    } catch (error) {
      console.error('❌ Auto-loading failed:', error);
    }
  }
  
  return moduleManager;
}

// Handle all HTTP methods for module API routes
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleModuleApiRequest('GET', request, await params);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleModuleApiRequest('POST', request, await params);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleModuleApiRequest('PUT', request, await params);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleModuleApiRequest('DELETE', request, await params);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleModuleApiRequest('PATCH', request, await params);
}

async function handleModuleApiRequest(
  method: string, 
  request: NextRequest, 
  params: { path: string[] }
) {
  try {
    // Reconstruct the full path
    const path = `/api/${params.path.join('/')}`;
    console.log(`🔍 Catch-all API: ${method} ${path}`);

    // Skip non-module routes - let them be handled by their specific route files
    const skipPaths = [
      '/api/admin',
      '/api/auth', 
      '/api/posts',
      '/api/debug',
      '/api/health',
      '/api/status',
      '/api/auto-seed'
    ];
    
    const shouldSkip = skipPaths.some(skipPath => path.startsWith(skipPath));
    if (shouldSkip) {
      console.log(`⏭️  Skipping ${path} - handled by specific route`);
      return NextResponse.next();
    }

    // Get the initialized module manager
    const moduleManagerInstance = await getModuleManager();

    // Check if this is a registered module route
    const registeredRoute = moduleManagerInstance.getRegisteredRoute(method, path);
    
    if (!registeredRoute) {
      console.log(`❌ No module route found for ${method} ${path}`);
      
      // Debug: show what routes ARE registered
      const availableRoutes = Array.from((moduleManagerInstance as any).registeredRoutes?.keys() || []);
      console.log(`📋 Available routes: ${JSON.stringify(availableRoutes)}`);
      
      return NextResponse.json(
        { 
          error: 'API endpoint not found',
          debug: process.env.NODE_ENV === 'development' ? {
            requestedPath: path,
            availableRoutes
          } : undefined
        },
        { status: 404 }
      );
    }

    console.log(`✅ Found module route: ${method} ${path}`);

    // Check authentication if route has permissions
    if (registeredRoute.permissions?.length > 0) {
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Check each required permission
      for (const permission of registeredRoute.permissions) {
        try {
          await requirePermission(session.user.id, permission);
        } catch (error: any) {
          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          );
        }
      }
    }

    // Create mock req/res objects that match what modules expect
    const req = await createModuleRequest(request);
    const res = createModuleResponse();

    // Execute the module handler
    try {
      await registeredRoute.handler(req, res);
      
      // Return the response created by the module
      return res.getNextResponse();
    } catch (handlerError: any) {
      console.error(`❌ Module handler error for ${method} ${path}:`, handlerError);
      return NextResponse.json(
        { 
          error: 'Module handler failed',
          details: process.env.NODE_ENV === 'development' ? handlerError.message : undefined
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error(`❌ Module API error for ${method} ${path}:`, error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Create a request object that modules can use
async function createModuleRequest(request: NextRequest) {
  const url = new URL(request.url);
  
  // Parse body based on content type
  let body = {};
  try {
    if (request.headers.get('content-type')?.includes('application/json')) {
      body = await request.json();
    } else if (request.headers.get('content-type')?.includes('form-data')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    }
  } catch (e) {
    // Body parsing failed, leave as empty object
  }

  return {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    query: Object.fromEntries(url.searchParams.entries()),
    body,
    params: {}, // Can be populated by the route if needed
  };
}

// Create a response object that modules can use
function createModuleResponse() {
  let statusCode = 200;
  let headers: Record<string, string> = {};
  let responseBody: any = null;
  let responseType: 'json' | 'text' | 'html' = 'json';

  const res = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    
    setHeader: (name: string, value: string) => {
      headers[name] = value;
      return res;
    },
    
    json: (data: any) => {
      responseBody = data;
      responseType = 'json';
      headers['Content-Type'] = 'application/json';
    },
    
    send: (data: string) => {
      responseBody = data;
      responseType = 'text';
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'text/plain';
      }
    },
    
    // Convert to NextResponse
    getNextResponse: () => {
      if (responseType === 'json') {
        return NextResponse.json(responseBody, { 
          status: statusCode, 
          headers 
        });
      } else {
        return new NextResponse(responseBody, {
          status: statusCode,
          headers
        });
      }
    }
  };

  return res;
}