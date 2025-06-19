import { BasePlugin } from '@vyral/plugin-sdk';
import type { PluginConfig } from '@vyral/plugin-sdk';
import { HookPriority } from '@vyral/plugin-sdk/dist/types/hooks';
import { PluginContext } from '@vyral/plugin-sdk/dist/types/plugin';

// Extend PluginHooks to include custom hooks if not present
declare module '@vyral/plugin-sdk/dist/types/hooks' {
  interface PluginHooks {
    'content:viewed': (contentId: string, context: any) => Promise<void>;
  }
}

export default class SimpleAnalyticsPlugin extends BasePlugin {
  constructor(config: PluginConfig, context: PluginContext) {
    super(config, context);
  }

  /**
   * Register plugin hooks (required by BasePlugin)
   */
  protected registerHooks(): void {
    // Track page views when content is viewed
    this.registerHook('content:viewed', this.trackPageView.bind(this), HookPriority.NORMAL);
    
    // Add analytics widget to admin dashboard
    this.registerHook('admin:dashboard-widgets', this.addDashboardWidget.bind(this), HookPriority.NORMAL);
    
    // Hook into content deletion to clean up analytics
    this.registerHook('content:before-delete', this.cleanupContentAnalytics.bind(this), HookPriority.NORMAL);
  }

  /**
   * Plugin activation lifecycle method
   */
  protected async onActivate(): Promise<void> {
    this.logger.info('Simple Analytics Plugin activated');
    
    // Register admin pages
    await this.registerAdminPages();

    // Initialize database collections
    await this.initializeDatabase();
    
    // Initialize cleanup task
    await this.initializeCleanupTask();
  }

  /**
   * Plugin deactivation lifecycle method
   */
  protected async onDeactivate(): Promise<void> {
    this.logger.info('Simple Analytics Plugin deactivated');
    
    // Cleanup any background tasks
    await this.cleanupTasks();
  }

  /**
   * Register admin pages
   */
  private async registerAdminPages(): Promise<void> {
    this.registerComponent('AnalyticsPage', 'AdminPage');
    this.registerRoute('/admin/analytics', 'AnalyticsPage');
  }

  /**
   * Track page view hook handler
   */
  private async trackPageView(contentId: string, context: any): Promise<void> {
    try {
      // Check if we should track this view
      if (!await this.shouldTrackView(context)) {
        return;
      }

      const now = new Date();
      const viewData = {
        contentId,
        contentType: context.contentType || 'post',
        ip: this.anonymizeIp(context.request?.ip || 'unknown'),
        userAgent: context.request?.headers?.['user-agent'] || 'unknown',
        userId: context.user?.id || null,
        sessionId: context.sessionId || null,
        timestamp: now,
        date: now.toISOString().split('T')[0], // YYYY-MM-DD format
        hour: now.getHours(),
        referrer: context.request?.headers?.referer || null,
        country: context.geoLocation?.country || null,
        device: this.detectDevice(context.request?.headers?.['user-agent']),
        source: this.detectSource(context.request?.headers?.referer)
      };

      // Store individual page view (simplified - would use actual storage API)
      await this.storePageView(viewData);
      
      // Update daily aggregated stats
      await this.updateDailyStats(viewData.date, viewData.contentId, viewData.contentType);
      
      this.logger.debug(`Page view tracked for content: ${contentId}`);
      
    } catch (error) {
      this.logger.error('Failed to track page view:', error);
    }
  }

  /**
   * Add dashboard widget hook handler
   */
  private async addDashboardWidget(widgets: any[], context: any): Promise<{ data: any[]; modified: boolean; stop: boolean }> {
    try {
      // Check if dashboard widget is enabled
      const showWidget = await this.getSetting('dashboard_widget', true);
      if (!showWidget) {
        return { data: widgets, modified: false, stop: false };
      }

      // Get today's stats (simplified)
      const today = new Date().toISOString().split('T')[0];
      const stats = await this.getBasicStats();

      const analyticsWidget = {
        id: 'simple-analytics',
        title: 'Page Views',
        type: 'stats',
        data: {
          today: stats.today || 0,
          weekly: stats.weekly || 0,
          total: stats.total || 0,
          trend: 'stable' // Simplified
        },
        component: 'AnalyticsWidget',
        order: 10
      };

      return { data: [...widgets, analyticsWidget], modified: true, stop: false };
    } catch (error) {
      this.logger.error('Failed to add analytics widget:', error);
      return { data: widgets, modified: false, stop: false };
    }
  }

  /**
   * Clean up analytics data when content is deleted
   */
  private async cleanupContentAnalytics(contentId: string, context: any): Promise<{ data: boolean; modified: boolean; stop: boolean }> {
    try {
      // Simplified cleanup - would use actual storage API
      this.logger.info(`Would clean up analytics data for content: ${contentId}`);
      return { data: true, modified: false, stop: false };
    } catch (error) {
      this.logger.error('Failed to cleanup content analytics:', error);
      return { data: true, modified: false, stop: false }; // Don't block content deletion
    }
  }

  /**
   * Store page view data (simplified implementation)
   */
  private async storePageView(viewData: any): Promise<void> {
    // This would use the actual plugin storage API when available
    // For now, just log it
    this.logger.debug('Page view data:', viewData);
  }

  /**
   * Update daily aggregated statistics (simplified)
   */
  private async updateDailyStats(date: string, contentId: string, contentType: string): Promise<void> {
    // Simplified implementation - would use actual storage
    this.logger.debug(`Would update daily stats for ${date}`);
  }

  /**
   * Get basic statistics (simplified)
   */
  private async getBasicStats(): Promise<any> {
    // Return mock data for now
    return {
      today: Math.floor(Math.random() * 100),
      weekly: Math.floor(Math.random() * 700),
      total: Math.floor(Math.random() * 10000)
    };
  }

  /**
   * Check if we should track this view
   */
  private async shouldTrackView(context: any): Promise<boolean> {
    // Check if anonymous tracking is enabled
    const trackAnonymous = await this.getSetting('track_anonymous', true);
    if (!trackAnonymous && !context.user) {
      return false;
    }

    // Check if admin users should be excluded
    const excludeAdmin = await this.getSetting('exclude_admin', true);
    if (excludeAdmin && context.user?.role === 'admin') {
      return false;
    }

    return true;
  }

  /**
   * Anonymize IP address for privacy
   */
  private anonymizeIp(ip: string): string {
    const anonymizeIp = this.getSetting('anonymize_ip', true);
    if (!anonymizeIp) return ip;

    // Simple IP anonymization - remove last octet for IPv4
    if (ip.includes('.')) {
      const parts = ip.split('.');
      return `${parts.slice(0, 3).join('.')}.0`;
    }
    
    // For IPv6, return truncated version
    if (ip.includes(':')) {
      const parts = ip.split(':');
      return `${parts.slice(0, 4).join(':')}::`;
    }
    
    return 'anonymized';
  }

  /**
   * Detect device type from user agent
   */
  private detectDevice(userAgent?: string): string {
    if (!userAgent) return 'unknown';
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile';
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    }
    return 'desktop';
  }

  /**
   * Detect traffic source
   */
  private detectSource(referrer?: string): string {
    if (!referrer) return 'direct';
    
    const ref = referrer.toLowerCase();
    if (ref.includes('google')) return 'google';
    if (ref.includes('facebook')) return 'facebook';
    if (ref.includes('twitter')) return 'twitter';
    if (ref.includes('linkedin')) return 'linkedin';
    
    return 'referral';
  }

  /**
   * Initialize database collections and indexes (simplified)
   */
  private async initializeDatabase(): Promise<void> {
    try {
      this.logger.info('Database collections would be initialized here');
    } catch (error) {
      this.logger.error('Failed to initialize database:', error);
    }
  }

  /**
   * Initialize cleanup task for old data (simplified)
   */
  private async initializeCleanupTask(): Promise<void> {
    try {
      this.logger.info('Cleanup task would be scheduled here');
    } catch (error) {
      this.logger.error('Failed to initialize cleanup task:', error);
    }
  }

  /**
   * Cleanup background tasks
   */
  private async cleanupTasks(): Promise<void> {
    this.logger.info('Background tasks would be cleaned up here');
  }
}
