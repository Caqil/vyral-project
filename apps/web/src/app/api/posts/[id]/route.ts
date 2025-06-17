import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '../../../../lib/db';
import { authOptions } from '../../../../lib/auth';
import { PostService } from '@vyral/core';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    
    const postService = new PostService();
    const post = await postService.findById(params.id, {
      populate: [
        { path: 'author', select: 'displayName avatar' },
        { path: 'categories', select: 'name slug' },
        { path: 'tags', select: 'name slug' },
        { path: 'featuredImage' }
      ]
    });

    if (!post) {
      return NextResponse.json(
        { success: false, message: 'Post not found' },
        { status: 404 }
      );
    }

    // Increment view count
    await postService.incrementViewCount(params.id);

    return NextResponse.json({
      success: true,
      data: post
    });
  } catch (error: any) {
    console.error('Failed to fetch post:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const body = await request.json();
    const postService = new PostService();
    
    // Check if user owns the post or has admin privileges
    const existingPost = await postService.findById(params.id);
    if (!existingPost) {
      return NextResponse.json(
        { success: false, message: 'Post not found' },
        { status: 404 }
      );
    }

    const canEdit = existingPost.author.toString() === session.user.id || 
                   ['admin', 'super_admin'].includes(session.user.role);
    
    if (!canEdit) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const post = await postService.updatePost(params.id, {
      ...body,
      updatedBy: session.user.id
    });

    return NextResponse.json({
      success: true,
      data: post
    });
  } catch (error: any) {
    console.error('Failed to update post:', error);
    
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const postService = new PostService();
    
    // Check if user owns the post or has admin privileges
    const existingPost = await postService.findById(params.id);
    if (!existingPost) {
      return NextResponse.json(
        { success: false, message: 'Post not found' },
        { status: 404 }
      );
    }

    const canDelete = existingPost.author.toString() === session.user.id || 
                     ['admin', 'super_admin'].includes(session.user.role);
    
    if (!canDelete) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    await postService.deletePost(params.id);

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error: any) {
    console.error('Failed to delete post:', error);
    
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
