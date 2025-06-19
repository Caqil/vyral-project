import Image from "next/image";
import Link from "next/link";
import { Clock, Eye, User } from "lucide-react";
import { formatRelativeTime } from "../../../../packages/plugin-sdk/src/utils/date-utils";
import { Badge, Card, CardContent, CardFooter } from "@/components/ui";
import { readingTime } from "../../../../packages/plugin-sdk/src/utils/string-utils";

interface PostCardProps {
  post: {
    _id: string;
    title: string;
    slug: string;
    excerpt?: string;
    content: string;
    featuredImage?: {
      url: string;
      alt?: string;
    };
    author: {
      displayName: string;
      avatar?: string;
    };
    categories: Array<{
      name: string;
      slug: string;
    }>;
    tags: Array<{
      name: string;
      slug: string;
    }>;
    publishedAt: string;
    viewCount?: number;
  };
}

export function PostCard({ post }: PostCardProps) {
  const readTime = readingTime(post.content);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {post.featuredImage && (
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={post.featuredImage.url}
            alt={post.featuredImage.alt || post.title}
            fill
            className="object-cover transition-transform hover:scale-105"
          />
        </div>
      )}

      <CardContent className="p-6">
        <div className="flex flex-wrap gap-2 mb-3">
          {post.categories.slice(0, 2).map((category) => (
            <Badge key={category.slug} variant="secondary">
              <Link href={`/category/${category.slug}`}>{category.name}</Link>
            </Badge>
          ))}
        </div>

        <h3 className="text-xl font-semibold mb-3 line-clamp-2">
          <Link
            href={`/post/${post.slug}`}
            className="hover:text-primary transition-colors"
          >
            {post.title}
          </Link>
        </h3>

        {post.excerpt && (
          <p className="text-muted-foreground mb-4 line-clamp-3">
            {post.excerpt}
          </p>
        )}
      </CardContent>

      <CardFooter className="px-6 pb-6 pt-0">
        <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <User className="h-4 w-4" />
              <span>{post.author.displayName}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{readTime} min read</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {post.viewCount && (
              <div className="flex items-center space-x-1">
                <Eye className="h-4 w-4" />
                <span>{post.viewCount}</span>
              </div>
            )}
            <time dateTime={post.publishedAt}>
              {formatRelativeTime(post.publishedAt)}
            </time>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
