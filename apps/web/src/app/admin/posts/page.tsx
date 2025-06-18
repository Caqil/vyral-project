import { Suspense } from "react";
import Link from "next/link";
import { PostService } from "@vyral/core";
import { connectDB } from "@/lib/db";
import { Button } from "@vyral/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@vyral/ui";
import { Badge } from "@vyral/uibadge";
import { Input } from "@vyral/uiinput";
import { Skeleton } from "@vyral/uiskeleton";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { Plus, Search, Filter, Edit, Trash2, Eye } from "lucide-react";

interface PostsPageProps {
  searchParams: {
    page?: string;
    search?: string;
    status?: string;
  };
}

async function getAdminPosts(searchParams: PostsPageProps["searchParams"]) {
  await connectDB();
  const postService = new PostService();

  const page = parseInt(searchParams.page || "1");
  const status = searchParams.status;
  const search = searchParams.search;

  if (status) {
    return await postService.getPostsByStatus(status as any, {
      page,
      limit: 20,
    });
  } else if (search) {
    return await postService.searchPosts(search, { page, limit: 20 });
  } else {
    return await postService.findMany(
      {},
      { page, limit: 20, sort: "updatedAt", order: "desc" }
    );
  }
}

function PostsContent({
  searchParams,
}: {
  searchParams: PostsPageProps["searchParams"];
}) {
  return (
    <Suspense fallback={<PostsTableSkeleton />}>
      <PostsTable searchParams={searchParams} />
    </Suspense>
  );
}

async function PostsTable({
  searchParams,
}: {
  searchParams: PostsPageProps["searchParams"];
}) {
  const { data: posts, pagination } = await getAdminPosts(searchParams);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "draft":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "private":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "trash":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="space-y-4">
      {posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold">No posts found</h3>
            <p className="text-muted-foreground mb-4">
              {searchParams.search
                ? "Try adjusting your search terms"
                : "Get started by creating your first post"}
            </p>
            <Button asChild>
              <Link href="/admin/posts/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Post
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {posts.map((post: any) => (
            <Card key={post._id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold">
                        <Link
                          href={`/admin/posts/${post._id}/edit`}
                          className="hover:text-primary transition-colors"
                        >
                          {post.title}
                        </Link>
                      </h3>
                      <Badge className={getStatusColor(post.status)}>
                        {post.status}
                      </Badge>
                    </div>

                    {post.excerpt && (
                      <p className="text-muted-foreground mb-3 line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}

                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>By {post.author?.displayName || "Unknown"}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(post.updatedAt)}</span>
                      {post.publishedAt && (
                        <>
                          <span>•</span>
                          <span>Published {formatDate(post.publishedAt)}</span>
                        </>
                      )}
                      {post.viewCount && (
                        <>
                          <span>•</span>
                          <span>{post.viewCount} views</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {post.status === "published" && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/post/${post.slug}`} target="_blank">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/posts/${post._id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center space-x-4">
          {pagination.hasPrev && (
            <Button variant="outline" asChild>
              <Link href={`/admin/posts?page=${pagination.page - 1}`}>
                Previous
              </Link>
            </Button>
          )}

          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.pages}
          </span>

          {pagination.hasNext && (
            <Button variant="outline" asChild>
              <Link href={`/admin/posts?page=${pagination.page + 1}`}>
                Next
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function PostsTableSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Skeleton className="h-6 w-64" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-3" />
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdminPostsPage({ searchParams }: PostsPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Posts</h1>
          <p className="text-muted-foreground">
            Manage your blog posts and pages
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/posts/new">
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </Link>
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search posts..." className="pl-10" />
        </div>

        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      <PostsContent searchParams={searchParams} />
    </div>
  );
}
