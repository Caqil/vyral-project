import { Comment } from '../../../comments/src';

export class CommentService {
  private db: any;

  constructor(database: any) {
    this.db = database;
  }

  async createIndexes(): Promise<void> {
    const collection = this.db.collection('comments');
    
    await collection.createIndex({ postId: 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ parentId: 1 });
    await collection.createIndex({ createdAt: -1 });
    await collection.createIndex({ 'author.email': 1 });
  }

  async createComment(data: Partial<Comment>): Promise<Comment> {
    const collection = this.db.collection('comments');
    const comment = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      likeCount: 0,
      dislikeCount: 0
    };

    const result = await collection.insertOne(comment);
    return { ...comment, _id: result.insertedId };
  }

  async getCommentsByPost(
    postId: string, 
    options: { status?: string; sort?: string; order?: 'asc' | 'desc' } = {}
  ): Promise<Comment[]> {
    const collection = this.db.collection('comments');
    const filter: any = { postId };
    
    if (options.status) {
      filter.status = options.status;
    }

    const sort: any = {};
    if (options.sort) {
      sort[options.sort] = options.order === 'desc' ? -1 : 1;
    }

    return await collection.find(filter).sort(sort).toArray();
  }

  async approveComment(id: string): Promise<Comment> {
    const collection = this.db.collection('comments');
    const result = await collection.findOneAndUpdate(
      { _id: id },
      { 
        $set: { 
          status: 'approved',
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error('Comment not found');
    }

    return result.value;
  }

  async getPendingCommentsCount(): Promise<number> {
    const collection = this.db.collection('comments');
    return await collection.countDocuments({ status: 'pending' });
  }

  async getRecentComments(limit: number = 10): Promise<Comment[]> {
    const collection = this.db.collection('comments');
    return await collection
      .find({ status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }
}