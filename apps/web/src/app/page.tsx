import { Suspense } from "react";
import { PostService } from "@vyral/core";
import { connectDB } from "@/lib/db";
import { PostCard } from "@/components/post-card";
import { PostCardSkeleton } from "@/components/skeletons";
import Link from "next/link";
import { Button } from '@vyral/ui';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* <Hero /> */}

      <main className="container mx-auto px-4 py-12">
        <section className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Recent Posts
              </h2>
              <p className="text-muted-foreground mt-2">
                Discover our latest articles and insights
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/blog">View All Posts</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
