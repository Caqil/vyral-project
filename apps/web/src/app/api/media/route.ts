import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { MediaService } from '@vyral/core';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use the core MediaService
    const mediaService = new MediaService();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const folder = searchParams.get('folder') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const page = Math.floor(offset / limit) + 1;

    const filterOptions: any = {};
    if (search) filterOptions.search = search;
    if (type && type !== 'all') filterOptions.mimeType = type;
    if (folder && folder !== 'all') filterOptions.folder = folder;

    // Use MediaService method
    const result = await mediaService.getMediaLibrary(
      filterOptions,
      { page, limit }
    );

    return NextResponse.json({
      success: true,
      data: {
        files: result.data,
        total: result.pagination.total,
        page: result.pagination.page,
        totalPages: result.pagination.pages,
        hasNextPage: result.pagination.hasNext,
        hasPrevPage: result.pagination.hasPrev,
        limit: result.pagination.limit
      }
    });

  } catch (error) {
    console.error('Media API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}