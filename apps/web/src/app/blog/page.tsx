import { Suspense } from "react";
import { PostService } from "@vyral/core";
import { connectDB } from "@/lib/db";
import { PostCard } from "@/components/post-card";
import { PostCardSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";

interface BlogPageProps {
  searchParams: {
    page?: string;
    search?: string;
    category?: string;
    tag?: string;
  };
}

async function getBlogPosts(searchParams: BlogPageProps["searchParams"]) {
  await connectDB();
  const postService = new PostService();

  const page = parseInt(searchParams.page || "1");
  const filters: any = {};

  if (searchParams.category) filters.category = searchParams.category;
  if (searchParams.tag) filters.tag = searchParams.tag;
  if (searchParams.search) filters.search = searchParams.search;

  return await postService.getPublishedPosts(
    { page, limit: 12, sort: "publishedAt", order: "desc" },
    filters
  );
}

function BlogPostsSection({
  searchParams,
}: {
  searchParams: BlogPageProps["searchParams"];
}) {
  return (
    <Suspense
      fallback={
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(12)].map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      }
    >
      <BlogPosts searchParams={searchParams} />
    </Suspense>
  );
}

async function BlogPosts({
  searchParams,
}: {
  searchParams: BlogPageProps["searchParams"];
}) {
  const { data: posts, pagination } = await getBlogPosts(searchParams);

  if (!posts.length) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-muted-foreground">
          No posts found
        </h3>
        <p className="text-muted-foreground">
          {searchParams.search
            ? "Try adjusting your search terms"
            : "Check back later for new content!"}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post._id} post={post} />
        ))}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center space-x-4 mt-12">
          {pagination.hasPrev && (
            <Button variant="outline" asChild>
              <a href={`/blog?page=${pagination.page - 1}`}>Previous</a>
            </Button>
          )}

          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.pages}
          </span>

          {pagination.hasNext && (
            <Button variant="outline" asChild>
              <a href={`/blog?page=${pagination.page + 1}`}>Next</a>
            </Button>
          )}
        </div>
      )}
    </>
  );
}

export default function BlogPage({ searchParams }: BlogPageProps) {
  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight mb-4">Blog</h1>
            <p className="text-xl text-muted-foreground">
              Discover articles, tutorials, and insights about modern web
              development
            </p>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        <BlogPostsSection searchParams={searchParams} />
      </main>
    </div>
  );
}
