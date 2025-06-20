import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ModuleManager } from '@vyral/core';
import { requirePermission, PermissionError } from '@/lib/permissions';

const moduleManager = new ModuleManager();

// GET /api/admin/modules - List all modules
export async function GET(request: NextRequest) {
  console.log('📡 API: Starting modules fetch...');
  const { searchParams } = new URL(request.url);
const page = parseInt(searchParams.get('page') || '1');
const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
const status = searchParams.get('status');
const category = searchParams.get('category');
const slug = searchParams.get('slug'); // NEW: Add slug parameter

// Build query filters
const filters: any = {};

if (status && status !== 'all') {
  filters.status = status;
}

if (category && category !== 'all') {
  filters['manifest.category'] = category;
}

// NEW: Add slug filter
if (slug) {
  filters['manifest.slug'] = slug;
}

// Then use filters in the query:
const modules = await moduleManager.findOne(filters, {
  page,
  limit,
  sort: { 'manifest.name': 1 }
});
  try {
    const session = await getServerSession(authOptions);
    console.log('👤 Session check:', { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      userId: session?.user?.id 
    });
    
    if (!session?.user?.id) {
      console.log('❌ API: No session or user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔐 Checking permissions for user:', session.user.id);
    
    try {
      await requirePermission(session.user.id, 'modules.manage');
      console.log('✅ Permission check passed');
    } catch (permError) {
      if (permError instanceof PermissionError) {
        console.log('❌ Permission denied:', permError.message);
        return NextResponse.json({ 
          error: permError.message,
          code: 'PERMISSION_DENIED'
        }, { status: permError.statusCode });
      }
      throw permError;
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    console.log('🔍 Query params:', { category, status });

    let modules;
    console.log('📊 Fetching modules from database...');
    
    if (category) {
      modules = await moduleManager.getModulesByCategory(category);
    } else if (status === 'active') {
      modules = await moduleManager.getActiveModules();
    } else {
      modules = await moduleManager.getAvailableModules();
    }

    console.log(`✅ Successfully fetched ${modules.length} modules`);
    return NextResponse.json({ modules });
    
  } catch (error: any) {
    console.error('❌ API Error:', {
      message: error.message,
      name: error.name,
      statusCode: error.statusCode,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    // Handle specific error types
    if (error.name === 'MongooseError' || error.message?.includes('buffering timed out')) {
      return NextResponse.json({
        error: 'Database connection timeout. Please try again.',
        code: 'DATABASE_TIMEOUT',
        retryAfter: 5
      }, { status: 503 });
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch modules',
        code: error.code || 'UNKNOWN_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: error.statusCode || 500 }
    );
  }
}

// POST /api/admin/modules - Upload new module  
export async function POST(request: NextRequest) {
  console.log('📤 API: Starting module upload...');
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requirePermission(session.user.id, 'modules.manage');

    const formData = await request.formData();
    const file = formData.get('module') as File;

    if (!file) {
      return NextResponse.json({ error: 'No module file provided' }, { status: 400 });
    }

    console.log(`📦 Processing file: ${file.name} (${file.size} bytes)`);

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await moduleManager.uploadModule(buffer, file.name, session.user.id);

    if (result.success) {
      console.log(`✅ Module uploaded: ${result.module?.manifest.slug}`);
      return NextResponse.json({ 
        message: 'Module uploaded successfully',
        module: result.module 
      });
    } else {
      console.log(`❌ Upload failed: ${result.error}`);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to upload module',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: error.statusCode || 500 }
    );
  }
}