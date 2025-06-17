import { useState, useEffect } from 'react';
import { Post } from '@vyral/core';

interface UsePostsOptions {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  tag?: string;
  status?: string;
}

interface PostsData {
  data: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function usePosts(options: UsePostsOptions = {}) {
  const [posts, setPosts] = useState<PostsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.page) params.set('page', options.page.toString());
      if (options.limit) params.set('limit', options.limit.toString());
      if (options.search) params.set('search', options.search);
      if (options.category) params.set('category', options.category);
      if (options.tag) params.set('tag', options.tag);
      if (options.status) params.set('status', options.status);

      const response = await fetch(`/api/posts?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch posts');
      }

      setPosts({
        data: result.data,
        pagination: result.pagination
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [
    options.page,
    options.limit,
    options.search,
    options.category,
    options.tag,
    options.status
  ]);

  return {
    posts: posts?.data || [],
    pagination: posts?.pagination,
    loading,
    error,
    refetch: fetchPosts
  };
}