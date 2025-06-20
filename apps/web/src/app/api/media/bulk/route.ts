
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
        for (const id of ids) {
          try {
            await mediaService.deleteMedia(id);
            results.push({ id, status: 'deleted' });
          } catch (error) {
            errors.push(`Failed to delete ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
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
            // Get current media to merge tags
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

      case 'untag':
        if (!data?.tags) {
          return NextResponse.json(
            { success: false, error: 'Tags data required for untagging operation' },
            { status: 400 }
          );
        }
        
        for (const id of ids) {
          try {
            // Get current media to remove tags
            const media = await mediaService.getMediaById(id);
            if (!media) {
              errors.push(`Media ${id} not found`);
              continue;
            }
            
            const existingTags = media.tags || [];
            const tagsToRemove = data.tags;
            const newTags = existingTags.filter(tag => !tagsToRemove.includes(tag));
            
            const updated = await mediaService.updateMedia(id, { tags: newTags });
            results.push({ id, status: 'untagged', data: updated });
          } catch (error) {
            errors.push(`Failed to untag ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        break;

      case 'publish':
        for (const id of ids) {
          try {
            const updated = await mediaService.updateMedia(id, { isPublic: true });
            results.push({ id, status: 'published', data: updated });
          } catch (error) {
            errors.push(`Failed to publish ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        break;

      case 'unpublish':
        for (const id of ids) {
          try {
            const updated = await mediaService.updateMedia(id, { isPublic: false });
            results.push({ id, status: 'unpublished', data: updated });
          } catch (error) {
            errors.push(`Failed to unpublish ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Invalid action: ${action}` },
          { status: 400 }
        );
    }

    const isFullSuccess = errors.length === 0;
    const message = isFullSuccess 
      ? `Successfully processed ${results.length} items`
      : `Processed ${results.length} items with ${errors.length} errors`;

    return NextResponse.json({
      success: isFullSuccess,
      data: {
        results,
        errors,
        processed: results.length,
        failed: errors.length,
        total: ids.length
      },
      message
    });

  } catch (error) {
    console.error('Bulk operation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}