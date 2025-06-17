import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PostService, validateData, PostSchema } from '@vyral/core';
import { connectDB } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sort = searchParams.get('sort') || 'publishedAt';
    const order = searchParams.get('order') as 'asc' | 'desc' || 'desc';
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');

    const postService = new PostService();
    
    let result;
    if (status) {
      result = await postService.getPostsByStatus(status as any, { page, limit, sort, order });
    } else if (search) {
      result = await postService.searchPosts(search, { page, limit, sort, order });
    } else {
      const filters: any = {};
      if (category) filters.category = category;
      if (tag) filters.tag = tag;
      
      result = await postService.getPublishedPosts({ page, limit, sort, order }, filters);
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error: any) {
    console.error('Failed to fetch posts:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}