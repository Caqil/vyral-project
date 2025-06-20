import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MediaService } from '@vyral/core';
import { connectDB } from '@/lib/db';

const mediaService = new MediaService();

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, ids, data } = body;

    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      );
    }

    let results: any[] = [];
    let errors: string[] = [];

    switch (action) {
      case 'delete':
        // ✅ ENHANCED: Now uses proper bulk delete with file cleanup
        const deleteResults = await mediaService.bulkDeleteMedia(ids);
        
        results = deleteResults.success.map(id => ({ id, status: 'deleted' }));
        errors = deleteResults.failed.map(id => `Failed to delete ${id}`);
        break;

      case 'update':
        if (!data) {
          return NextResponse.json(
            { success: false, error: 'Update data required' },
            { status: 400 }
          );
        }
        
        for (const id of ids) {
          try {
            const updated = await mediaService.updateMedia(id, data);
            results.push({ id, status: 'updated', data: updated });
          } catch (error) {
            errors.push(`Failed to update ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        break;

      case 'move':
        if (!data?.folder) {
          return NextResponse.json(
            { success: false, error: 'Folder data required for move operation' },
            { status: 400 }
          );
        }
        
        for (const id of ids) {
          try {
            const updated = await mediaService.updateMedia(id, { folder: data.folder });
            results.push({ id, status: 'moved', data: updated });
          } catch (error) {
            errors.push(`Failed to move ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        break;

      case 'tag':
        if (!data?.tags) {
          return NextResponse.json(
            { success: false, error: 'Tags data required for tagging operation' },
            { status: 400 }
          );
        }
        
        for (const id of ids) {
          try {
            const media = await mediaService.getMediaById(id);
            if (!media) {
              errors.push(`Media ${id} not found`);
              continue;
            }
            
            const existingTags = media.tags || [];
            const newTags = Array.from(new Set([...existingTags, ...data.tags]));
            
            const updated = await mediaService.updateMedia(id, { tags: newTags });
            results.push({ id, status: 'tagged', data: updated });
          } catch (error) {
            errors.push(`Failed to tag ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        break;

      case 'star':
        for (const id of ids) {
          try {
            const updated = await mediaService.updateMedia(id, { starred: true });
            results.push({ id, status: 'starred', data: updated });
          } catch (error) {
            errors.push(`Failed to star ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        break;

      case 'unstar':
        for (const id of ids) {
          try {
            const updated = await mediaService.updateMedia(id, { starred: false });
            results.push({ id, status: 'unstarred', data: updated });
          } catch (error) {
            errors.push(`Failed to unstar ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: {
        results,
        errors,
        summary: {
          total: ids.length,
          successful: results.length,
          failed: errors.length
        }
      },
      message: `Bulk ${action} completed`
    });

  } catch (error) {
    console.error('Bulk operation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bulk operation failed' 
      },
      { status: 500 }
    );
  }
}

// ✅ NEW: Cleanup endpoint for orphaned files
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'super_admin'].includes(session.user.role ?? '')) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const mediaService = new MediaService();
    const cleanupResults = await mediaService.cleanupOrphanedFiles();

    return NextResponse.json({
      success: true,
      data: cleanupResults,
      message: `Cleanup completed: ${cleanupResults.cleaned.length} files removed`
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Cleanup failed' 
      },
      { status: 500 }
    );
  }
}