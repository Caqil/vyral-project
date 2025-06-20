import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ModuleManager } from '@vyral/core';
import { requirePermission } from '@/lib/permissions';

const moduleManager = new ModuleManager();

// GET /api/admin/modules/[id] - Get module details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // FIXED: Await params before using
    const resolvedParams = await params;
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requirePermission(session.user.id, 'modules.manage');

    const module = await moduleManager.findByIdOrThrow(resolvedParams.id);
    return NextResponse.json({ module });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Module not found' },
      { status: error.statusCode || 404 }
    );
  }
}

// PUT /api/admin/modules/[id] - Update module configuration
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // FIXED: Await params before using
    const resolvedParams = await params;
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requirePermission(session.user.id, 'modules.manage');

    const { config } = await request.json();
    const module = await moduleManager.updateModuleConfig(resolvedParams.id, config, session.user.id);

    return NextResponse.json({ 
      message: 'Module configuration updated',
      module 
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update module' },
      { status: error.statusCode || 500 }
    );
  }
}

// DELETE /api/admin/modules/[id] - Uninstall module
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // FIXED: Await params before using
    const resolvedParams = await params;
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requirePermission(session.user.id, 'modules.manage');

    await moduleManager.uninstallModule(resolvedParams.id, session.user.id);

    return NextResponse.json({ message: 'Module uninstalled successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to uninstall module' },
      { status: error.statusCode || 500 }
    );
  }
}