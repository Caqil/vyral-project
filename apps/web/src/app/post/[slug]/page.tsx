import { Suspense } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { PostService } from "@vyral/core";
import { connectDB } from "@/lib/db";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostSkeleton } from "@/components/skeletons";
import { formatDate, readingTime } from "@/lib/utils";
import { Calendar, Clock, Eye, User, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PostPageProps {
  params: { slug: string };
}

async function getPost(slug: string) {
  await connectDB();
  const postService = new PostService();

  const post = await postService.getPostBySlug(slug);
  if (!post) {
    notFound();
  }

  // Get related posts
  const relatedPosts = await postService.getRelatedPosts(
    post._id.toString(),
    3
  );

  return { post, relatedPosts };
}

function PostContent({ slug }: { slug: string }) {
  return (
    <Suspense fallback={<PostSkeleton />}>
      <PostData slug={slug} />
    </Suspense>
  );
}

async function PostData({ slug }: { slug: string }) {
  const { post, relatedPosts } = await getPost(slug);
  const readTime = readingTime(post.content);

  return (
    <>
      <article className="max-w-4xl mx-auto">
        {/* Back button */}
        <div className="mb-8">
          <Button variant="ghost" asChild>
            <Link href="/blog">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Link>
          </Button>
        </div>

        {/* Featured image */}
        {post.featuredImage && (
          <div className="relative aspect-video mb-8 overflow-hidden rounded-lg">
            <Image
              src={post.featuredImage.url}
              alt={post.featuredImage.alt || post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-4">
          {post.categories.map((category: any) => (
            <Badge key={category._id} variant="secondary">
              <Link href={`/category/${category.slug}`}>{category.name}</Link>
            </Badge>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          {post.title}
        </h1>

        {/* Meta information */}
        <div className="flex flex-wrap items-center gap-6 mb-8 text-muted-foreground">
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={post.author.avatar} />
              <AvatarFallback>
                {post.author.displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{post.author.displayName}</span>
          </div>

          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <time dateTime={post.publishedAt}>
              {formatDate(post.publishedAt)}
            </time>
          </div>

          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>{readTime} min read</span>
          </div>

          {post.viewCount && (
            <div className="flex items-center space-x-1">
              <Eye className="h-4 w-4" />
              <span>{post.viewCount} views</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none mb-8">
          <RichTextEditor content={post.content} editable={false} />
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="border-t pt-6 mb-8">
            <h3 className="text-lg font-semibold mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag: any) => (
                <Badge key={tag._id} variant="outline">
                  <Link href={`/tag/${tag.slug}`}>{tag.name}</Link>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <section className="max-w-6xl mx-auto mt-16">
          <h2 className="text-2xl font-bold mb-8">Related Posts</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {relatedPosts.slice(0, 3).map((relatedPost) => (
              <div key={relatedPost._id} className="group">
                <Link href={`/post/${relatedPost.slug}`}>
                  {relatedPost.featuredImage && (
                    <div className="relative aspect-video mb-3 overflow-hidden rounded-lg">
                      <Image
                        src={relatedPost.featuredImage.url}
                        alt={relatedPost.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  )}
                  <h3 className="font-semibold group-hover:text-primary transition-colors">
                    {relatedPost.title}
                  </h3>
                  {relatedPost.excerpt && (
                    <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                      {relatedPost.excerpt}
                    </p>
                  )}
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default function PostPage({ params }: PostPageProps) {
  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-12">
        <PostContent slug={params.slug} />
      </main>
    </div>
  );
}
