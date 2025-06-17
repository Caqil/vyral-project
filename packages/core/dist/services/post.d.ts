import { BaseService } from './base';
import { PostDocument } from '../models/post';
import { Post, ContentStatusType } from '../types/content';
import { PaginationParams, PaginationResult } from '../types/api';
export declare class PostService extends BaseService<PostDocument> {
    private cache;
    constructor();
    createPost(data: Partial<Post>): Promise<PostDocument>;
    getPostBySlug(slug: string, includePrivate?: boolean): Promise<PostDocument | null>;
    getPublishedPosts(pagination?: PaginationParams, filters?: {
        category?: string;
        tag?: string;
        author?: string;
        search?: string;
    }): Promise<PaginationResult<PostDocument>>;
    updatePost(id: string, data: Partial<Post>): Promise<PostDocument>;
    deletePost(id: string): Promise<void>;
    incrementViewCount(id: string): Promise<void>;
    getRelatedPosts(postId: string, limit?: number): Promise<PostDocument[]>;
    getPostsByStatus(status: ContentStatusType, pagination?: PaginationParams): Promise<PaginationResult<PostDocument>>;
    searchPosts(query: string, pagination?: PaginationParams): Promise<PaginationResult<PostDocument>>;
}
//# sourceMappingURL=post.d.ts.map