import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ModuleManager } from '@vyral/core';
import { requirePermission } from '@/lib/permissions';
import { connectDB } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requirePermission(session.user.id, 'modules.manage');
    await connectDB();
    
    const moduleManager = new ModuleManager();
    const result = await moduleManager.scanModulesDirectory();

    return NextResponse.json({
      message: 'Scan completed',
      scanned: result.scanned,
      registered: result.registered,
      errors: result.errors
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Scan failed' },
      { status: 500 }
    );
  }
}