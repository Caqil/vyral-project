// apps/web/src/app/api/media/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { MediaService } from '@vyral/core';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const mediaService = new MediaService();
    const media = await mediaService.getMediaById(params.id);
    
    if (!media) {
      return NextResponse.json(
        { success: false, error: 'Media not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: media
    });

  } catch (error) {
    console.error('Media GET Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const mediaService = new MediaService();
    const body = await request.json();
    
    // Validate update data
    const allowedUpdates = ['alt', 'caption', 'tags', 'folder', 'starred', 'title', 'description'];
    const updates = Object.keys(body).reduce((acc, key) => {
      if (allowedUpdates.includes(key)) {
        acc[key] = body[key];
      }
      return acc;
    }, {} as any);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid update fields provided' },
        { status: 400 }
      );
    }

    const updatedMedia = await mediaService.updateMedia(params.id, updates);

    return NextResponse.json({
      success: true,
      data: updatedMedia,
      message: 'Media updated successfully'
    });

  } catch (error) {
    console.error('Media UPDATE Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * ✅ ENHANCED DELETE: Now properly deletes files from file system
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const mediaService = new MediaService();
    
    // Check if media exists and user has permission
    const media = await mediaService.getMediaById(params.id);
    if (!media) {
      return NextResponse.json(
        { success: false, error: 'Media not found' },
        { status: 404 }
      );
    }

    // Optional: Check if user owns the media or has admin rights
    const isOwner = media.uploadedBy?.toString() === session.user.id;
    const isAdmin = session.user.role === 'admin' || session.user.role === 'super_admin';
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    // ✅ This now deletes both DB record AND physical files
    await mediaService.deleteMedia(params.id);

    return NextResponse.json({
      success: true,
      message: 'Media and associated files deleted successfully'
    });

  } catch (error) {
    console.error('Media DELETE Error:', error);
    
    // More specific error handling
    if (typeof error === 'object' && error !== null && 'name' in error && (error as any).name === 'CastError') {
      return NextResponse.json(
        { success: false, error: 'Invalid media ID' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete media' 
      },
      { status: 500 }
    );
  }
}