import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ModuleManager } from '@vyral/core';
import { requirePermission } from '@/lib/permissions';

const moduleManager = new ModuleManager();

export async function POST(
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

    const module = await moduleManager.deactivateModule(resolvedParams.id, session.user.id);

    return NextResponse.json({ 
      message: 'Module deactivated successfully',
      module 
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to deactivate module' },
      { status: error.statusCode || 500 }
    );
  }
}