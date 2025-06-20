import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MediaService } from '@vyral/core';
import { connectDB } from '@/lib/db';

const mediaService = new MediaService();

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

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || '';
    const folder = searchParams.get('folder') || '';
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!query.trim()) {
      return NextResponse.json(
        { success: false, error: 'Search query is required' },
        { status: 400 }
      );
    }

    const options: any = {};
    if (type) options.mimeType = type;
    if (folder) options.folder = folder;

    const results = await mediaService.searchMedia(
      query, 
      options,
      { page: 1, limit }
    );

    return NextResponse.json({
      success: true,
      data: {
        files: results.data,
        total: results.pagination.total,
        query,
        limit,
        page: results.pagination.page,
        totalPages: results.pagination.pages
      }
    });

  } catch (error) {
    console.error('Media search error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Search failed' 
      },
      { status: 500 }
    );
  }
}