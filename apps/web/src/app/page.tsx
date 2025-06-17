import { Suspense } from 'react';
import { PostService } from '@vyral/core';
import { connectDB } from '@/lib/db';
import { PostCard } from '@/components/post-card';
import { Hero } from '@/components/hero';
import { PostCardSkeleton } from '@/components/skeletons';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

async function getRecentPosts() {
  await connectDB();
  const postService = new PostService();
  
  const result = await postService.getPublishedPosts({
    page: 1,
    limit: 6,
    sort: 'publishedAt',
    order: 'desc'
  });

  return result.data;
}

function RecentPostsSection() {
  return (
    <Suspense 
      fallback={
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      }
    >
      <RecentPosts />
    </Suspense>
  );
}

async function RecentPosts() {
  const posts = await getRecentPosts();

  if (!posts.length) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-muted-foreground">No posts yet</h3>
        <p className="text-muted-foreground">Check back later for new content!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <PostCard key={post._id} post={post} />
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Hero />
      
      <main className="container mx-auto px-4 py-12">
        <section className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Recent Posts</h2>
              <p className="text-muted-foreground mt-2">
                Discover our latest articles and insights
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/blog">View All Posts</Link>
            </Button>
          </div>
          
          <RecentPostsSection />
        </section>
      </main>
    </div>
  );
}