import { BasePlugin, Hook, AdminPage, Setting, Route, HookPriority } from '@vyral/plugin-sdk';
import { Post, HookContext, HookResult } from '@vyral/plugin-sdk/types';
import { SEOOptimizer } from './services/seo-optimizer';
import { SitemapGenerator } from './services/sitemap-generator';
import { SchemaMarkup } from './services/schema-markup';

export default class SEOPlugin extends BasePlugin {
  public config = {
    name: 'vyral-seo',
    version: '1.0.0',
    description: 'Comprehensive SEO optimization plugin for Vyral CMS',
    author: 'Vyral Team',
    vyralVersion: '^1.0.0'
  };

  private seoOptimizer: SEOOptimizer;
  private sitemapGenerator: SitemapGenerator;
  private schemaMarkup: SchemaMarkup;

  @Setting('default_meta_title', 'Default Meta Title', { type: 'text' })
  private defaultMetaTitle: string = '';

  @Setting('meta_title_separator', 'Title Separator', { 
    type: 'select', 
    default: '|',
    options: [
      { label: '| (pipe)', value: '|' },
      { label: '- (dash)', value: '-' },
      { label: '– (en dash)', value: '–' },
      { label: '— (em dash)', value: '—' }
    ]
  })
  private titleSeparator: string = '|';

  @Setting('enable_schema_markup', 'Enable Schema Markup', { type: 'boolean', default: true })
  private enableSchemaMarkup: boolean = true;

  @Setting('google_analytics_id', 'Google Analytics ID', { type: 'text' })
  private googleAnalyticsId: string = '';

  @Setting('google_site_verification', 'Google Site Verification', { type: 'text' })
  private googleSiteVerification: string = '';

  protected async onActivate(): Promise<void> {
    this.logger.info('Activating SEO Plugin...');

    // Initialize services
    this.seoOptimizer = new SEOOptimizer();
    this.sitemapGenerator = new SitemapGenerator(this.context.api);
    this.schemaMarkup = new SchemaMarkup();

    this.logger.info('SEO Plugin activated successfully');
  }

  protected registerHooks(): void {
    this.registerHook('content:before-render', this.optimizeContent.bind(this), HookPriority.HIGH);
    this.registerHook('frontend:head', this.addMetaTags.bind(this), HookPriority.HIGH);
    this.registerHook('admin:menu', this.addAdminMenuItems.bind(this));
  }

  @Hook('content:before-render', HookPriority.HIGH)
  private async optimizeContent(post: Post, context: HookContext): Promise<HookResult<Post>> {
    try {
      // Optimize content for SEO
      const optimizedPost = await this.seoOptimizer.optimizePost(post);
      
      // Add reading time if not present
      if (!optimizedPost.metadata.readingTime) {
        optimizedPost.metadata.readingTime = this.calculateReadingTime(post.content);
      }

      // Generate excerpt if missing
      if (!optimizedPost.excerpt) {
        optimizedPost.excerpt = this.generateExcerpt(post.content);
      }

      return { data: optimizedPost, modified: true, stop: false };
    } catch (error) {
      this.logger.error('Error optimizing content:', error);
      return { data: post, modified: false, stop: false };
    }
  }

  @Hook('frontend:head', HookPriority.HIGH)
  private async addMetaTags(head: string, context: HookContext): Promise<HookResult<string>> {
    try {
      let metaTags = '';

      // Add basic meta tags
      if (this.googleSiteVerification) {
        metaTags += `<meta name="google-site-verification" content="${this.googleSiteVerification}" />\n`;
      }

      // Add Google Analytics
      if (this.googleAnalyticsId) {
        metaTags += `
          <script async src="https://www.googletagmanager.com/gtag/js?id=${this.googleAnalyticsId}"></script>
          <script>
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${this.googleAnalyticsId}');
          </script>
        `;
      }

      // Add schema markup if enabled
      if (this.enableSchemaMarkup && context.request?.url) {
        const schemaData = await this.schemaMarkup.generateSchema(context.request.url);
        if (schemaData) {
          metaTags += `<script type="application/ld+json">${JSON.stringify(schemaData)}</script>\n`;
        }
      }

      const enhancedHead = head + metaTags;
      return { data: enhancedHead, modified: true, stop: false };
    } catch (error) {
      this.logger.error('Error adding meta tags:', error);
      return { data: head, modified: false, stop: false };
    }
  }

  @Hook('admin:menu')
  private async addAdminMenuItems(menu: any[], context: HookContext): Promise<HookResult<any[]>> {
    menu.push({
      title: 'SEO',
      slug: 'seo',
      icon: 'Search',
      children: [
        {
          title: 'Overview',
          slug: 'seo',
          component: 'SEOAdminPage'
        },
        {
          title: 'Meta Tags',
          slug: 'seo/meta',
          component: 'MetaTagsPage'
        },
        {
          title: 'Sitemap',
          slug: 'seo/sitemap',
          component: 'SitemapPage'
        }
      ]
    });

    return { data: menu, modified: true, stop: false };
  }

  @Route({ path: '/sitemap.xml', method: 'GET' })
  private async generateSitemap(req: any, res: any): Promise<void> {
    try {
      const sitemap = await this.sitemapGenerator.generate();
      
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(sitemap);
    } catch (error) {
      this.logger.error('Error generating sitemap:', error);
      res.status(500).send('Error generating sitemap');
    }
  }

  @Route({ path: '/robots.txt', method: 'GET' })
  private async generateRobots(req: any, res: any): Promise<void> {
    try {
      const robotsTxt = await this.generateRobotsTxt();
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(robotsTxt);
    } catch (error) {
      this.logger.error('Error generating robots.txt:', error);
      res.status(500).send('Error generating robots.txt');
    }
  }

  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  private generateExcerpt(content: string, length: number = 160): string {
    const plainText = content.replace(/<[^>]*>/g, '');
    return plainText.length > length 
      ? plainText.substring(0, length - 3) + '...'
      : plainText;
  }

  private async generateRobotsTxt(): Promise<string> {
    const siteUrl = await this.context.api.getPluginSetting('site_url', 'http://localhost:3000');
    
    return `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /auth/

Sitemap: ${siteUrl}/sitemap.xml`;
  }
}