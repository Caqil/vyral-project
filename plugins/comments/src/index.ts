import { BasePlugin, Hook, AdminPage, Setting, Route, HookPriority } from '../../../packages/plugin-sdk/src';
import { Post, Comment, User, HookContext, HookResult } from '../../../packages/plugin-sdk/src';
import { CommentService } from './services/comment-service';
import { SpamFilter } from './utils/spam-filter';
import { CommentNotification } from './utils/notification';

export default class CommentsPlugin extends BasePlugin {
  public config = {
    name: 'vyral-comments',
    version: '1.0.0',
    description: 'Advanced commenting system with moderation, threading, and spam protection',
    author: 'Vyral Team',
    vyralVersion: '^1.0.0'
  };

  private commentService: CommentService;
  private spamFilter: SpamFilter;
  private notification: CommentNotification;

  @Setting('enable_comments', 'Enable Comments', { type: 'boolean', default: true })
  private enableComments: boolean = true;

  @Setting('require_moderation', 'Require Moderation', { type: 'boolean', default: true })
  private requireModeration: boolean = true;

  @Setting('max_comment_length', 'Maximum Comment Length', { type: 'number', default: 1000 })
  private maxCommentLength: number = 1000;

  @Setting('allow_guest_comments', 'Allow Guest Comments', { type: 'boolean', default: true })
  private allowGuestComments: boolean = true;

  @Setting('spam_filter_enabled', 'Enable Spam Filter', { type: 'boolean', default: true })
  private spamFilterEnabled: boolean = true;

  @Setting('notification_email', 'Notification Email', { type: 'text' })
  private notificationEmail: string = '';

  protected async onActivate(): Promise<void> {
    this.logger.info('Activating Comments Plugin...');

    // Initialize services
    this.commentService = new CommentService(this.context.api.getDatabase());
    this.spamFilter = new SpamFilter();
    this.notification = new CommentNotification();

    // Create database indexes
    await this.commentService.createIndexes();

    this.logger.info('Comments Plugin activated successfully');
  }

  protected async onDeactivate(): Promise<void> {
    this.logger.info('Deactivating Comments Plugin...');
    // Cleanup if needed
  }

  protected registerHooks(): void {
    this.registerHook('content:after-render', this.appendCommentsToContent.bind(this), HookPriority.NORMAL);
    this.registerHook('admin:menu', this.addAdminMenuItems.bind(this));
    this.registerHook('admin:dashboard-widgets', this.addDashboardWidgets.bind(this));
  }

  @Hook('content:after-render', HookPriority.NORMAL)
  private async appendCommentsToContent(
    html: string, 
    post: Post, 
    context: HookContext
  ): Promise<HookResult<string>> {
    if (!this.enableComments || post.commentStatus !== 'open') {
      return { data: html, modified: false, stop: false };
    }

    try {
      // Get comments for this post
      const comments = await this.commentService.getCommentsByPost(post._id!, {
        status: 'approved',
        sort: 'createdAt',
        order: 'asc'
      });

      // Build comment HTML
      const commentsHtml = this.buildCommentsHtml(comments, post._id!);
      const commentFormHtml = this.buildCommentFormHtml(post._id!);

      // Append to content
      const enhancedHtml = html + `
        <div id="comments-section" class="comments-section mt-8">
          <h3 class="text-xl font-semibold mb-4">Comments (${comments.length})</h3>
          ${commentsHtml}
          ${commentFormHtml}
        </div>
      `;

      return { data: enhancedHtml, modified: true, stop: false };
    } catch (error) {
      this.logger.error('Error appending comments:', error);
      return { data: html, modified: false, stop: false };
    }
  }

  @Hook('admin:menu')
  private async addAdminMenuItems(menu: any[], context: HookContext): Promise<HookResult<any[]>> {
    const pendingCount = await this.commentService.getPendingCommentsCount();

    menu.push({
      title: 'Comments',
      slug: 'comments',
      icon: 'MessageSquare',
      badge: pendingCount > 0 ? pendingCount.toString() : undefined,
      children: [
        {
          title: 'All Comments',
          slug: 'comments',
          component: 'CommentsAdminPage'
        },
        {
          title: 'Pending',
          slug: 'comments/pending',
          component: 'PendingCommentsPage',
          badge: pendingCount > 0 ? pendingCount.toString() : undefined
        },
        {
          title: 'Settings',
          slug: 'comment-settings',
          component: 'CommentSettingsPage'
        }
      ]
    });

    return { data: menu, modified: true, stop: false };
  }

  @Hook('admin:dashboard-widgets')
  private async addDashboardWidgets(widgets: any[], context: HookContext): Promise<HookResult<any[]>> {
    const recentComments = await this.commentService.getRecentComments(5);
    const pendingCount = await this.commentService.getPendingCommentsCount();

    widgets.push({
      id: 'comments-overview',
      title: 'Comments Overview',
      component: 'CommentsOverviewWidget',
      data: {
        recent: recentComments,
        pending: pendingCount
      },
      size: 'medium'
    });

    return { data: widgets, modified: true, stop: false };
  }

  @Route({ path: '/api/plugins/comments', method: 'POST' })
  private async createComment(req: any, res: any): Promise<void> {
    try {
      const { postId, content, author, parentId } = req.body;

      // Validate input
      if (!postId || !content || !author) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      if (content.length > this.maxCommentLength) {
        return res.status(400).json({
          success: false,
          message: `Comment exceeds maximum length of ${this.maxCommentLength} characters`
        });
      }

      // Check spam
      if (this.spamFilterEnabled) {
        const isSpam = await this.spamFilter.checkSpam(content, author);
        if (isSpam) {
          return res.status(400).json({
            success: false,
            message: 'Comment flagged as spam'
          });
        }
      }

      // Create comment
      const commentData = {
        postId,
        content,
        author,
        parentId,
        status: this.requireModeration ? 'pending' : 'approved',
        ip: req.ip,
        userAgent: req.headers['user-agent']
      };

      const comment = await this.commentService.createComment(commentData);

      // Send notification
      if (this.notificationEmail) {
        await this.notification.sendNewCommentNotification(
          comment,
          this.notificationEmail
        );
      }

      res.json({
        success: true,
        data: comment,
        message: this.requireModeration 
          ? 'Comment submitted for moderation' 
          : 'Comment posted successfully'
      });

    } catch (error) {
      this.logger.error('Error creating comment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create comment'
      });
    }
  }

  @Route({ path: '/api/plugins/comments/:id/approve', method: 'PUT', permission: 'moderate_comments' })
  private async approveComment(req: any, res: any): Promise<void> {
    try {
      const { id } = req.params;
      const comment = await this.commentService.approveComment(id);

      res.json({
        success: true,
        data: comment,
        message: 'Comment approved successfully'
      });

    } catch (error) {
      this.logger.error('Error approving comment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve comment'
      });
    }
  }

  private buildCommentsHtml(comments: Comment[], postId: string): string {
    if (comments.length === 0) {
      return '<p class="text-gray-500">No comments yet. Be the first to comment!</p>';
    }

    const threaded = this.buildCommentThread(comments);
    return this.renderCommentThread(threaded);
  }

  private buildCommentThread(comments: Comment[]): any[] {
    const commentMap = new Map();
    const roots: any[] = [];

    // Create comment objects with children arrays
    comments.forEach(comment => {
      commentMap.set(comment._id, { ...comment, children: [] });
    });

    // Build the tree structure
    comments.forEach(comment => {
      const commentObj = commentMap.get(comment._id);
      if (comment.parentId && commentMap.has(comment.parentId)) {
        commentMap.get(comment.parentId).children.push(commentObj);
      } else {
        roots.push(commentObj);
      }
    });

    return roots;
  }

  private renderCommentThread(comments: any[], depth: number = 0): string {
    return comments.map(comment => `
      <div class="comment ${depth > 0 ? 'ml-8' : ''} mb-4 p-4 border rounded-lg">
        <div class="comment-header mb-2">
          <strong class="author">${comment.author.name}</strong>
          <time class="text-sm text-gray-500 ml-2">
            ${new Date(comment.createdAt).toLocaleDateString()}
          </time>
        </div>
        <div class="comment-content">
          ${this.escapeHtml(comment.content)}
        </div>
        <div class="comment-actions mt-2">
          <button class="reply-btn text-sm text-blue-600 hover:underline" 
                  data-comment-id="${comment._id}">
            Reply
          </button>
        </div>
        ${comment.children.length > 0 ? this.renderCommentThread(comment.children, depth + 1) : ''}
      </div>
    `).join('');
  }

  private buildCommentFormHtml(postId: string): string {
    if (!this.allowGuestComments) {
      return `
        <div class="comment-form-notice">
          <p>Please <a href="/auth/signin">sign in</a> to leave a comment.</p>
        </div>
      `;
    }

    return `
      <div class="comment-form mt-6">
        <h4 class="text-lg font-semibold mb-4">Leave a Comment</h4>
        <form id="comment-form" data-post-id="${postId}">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input type="text" name="name" placeholder="Your Name" required 
                   class="px-3 py-2 border rounded-md">
            <input type="email" name="email" placeholder="Your Email" required 
                   class="px-3 py-2 border rounded-md">
          </div>
          <textarea name="content" placeholder="Your comment..." required 
                    rows="4" maxlength="${this.maxCommentLength}"
                    class="w-full px-3 py-2 border rounded-md mb-4"></textarea>
          <button type="submit" 
                  class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Post Comment
          </button>
        </form>
      </div>
      
      <script>
        document.getElementById('comment-form').addEventListener('submit', async function(e) {
          e.preventDefault();
          const formData = new FormData(e.target);
          const data = {
            postId: e.target.dataset.postId,
            author: {
              name: formData.get('name'),
              email: formData.get('email')
            },
            content: formData.get('content')
          };
          
          try {
            const response = await fetch('/api/plugins/comments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            
            const result = await response.json();
            if (result.success) {
              alert(result.message);
              e.target.reset();
            } else {
              alert(result.message);
            }
          } catch (error) {
            alert('Failed to post comment');
          }
        });
      </script>
    `;
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, char => map[char]);
  }
}