# Vyral CMS - Web Application

This is the main web application for Vyral CMS, built with Next.js 13+ and the App Router.

## 🚀 Features

- **Modern Next.js 13+** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** components
- **TipTap** rich text editor
- **NextAuth.js** authentication
- **MongoDB** database integration
- **Plugin system** for extensibility
- **Theme support** for customization
- **SEO optimized** with meta tags and structured data
- **Responsive design** for all devices
- **Dark/light mode** support

## 📦 Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Edit environment variables
nano .env.local

# Setup database
npm run db:setup

# Seed sample data
npm run db:seed

# Start development server
npm run dev
```

## 🔧 Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/vyral_cms

# Authentication
NEXTAUTH_SECRET=your-super-secret-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret-for-core-package

# File Upload
UPLOAD_DIR=./public/uploads
MAX_FILE_SIZE=10485760
```

## 🗄️ Database Setup

1. **Setup Database:**

   ```bash
   npm run db:setup
   ```

   This creates all necessary collections and indexes, plus a default admin user.

2. **Seed Sample Data:**

   ```bash
   npm run db:seed
   ```

   This adds sample posts, categories, and settings.

3. **Default Admin User:**
   - **Email:** admin@vyral.com
   - **Password:** admin123
   - **Important:** Change this password after first login!

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js 13+ App Router
│   ├── admin/             # Admin dashboard
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── blog/              # Blog listing
│   ├── post/              # Individual post pages
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── admin/             # Admin-specific components
│   ├── editor/            # Rich text editor
│   └── ui/                # shadcn/ui components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
└── types/                 # TypeScript types
```

## 🎨 Styling

The application uses:

- **Tailwind CSS** for utility-first styling
- **shadcn/ui** for beautiful, accessible components
- **CSS variables** for theming
- **Dark/light mode** support

## 🔐 Authentication

Authentication is handled by NextAuth.js with:

- **Credentials provider** for email/password login
- **MongoDB adapter** for session storage
- **JWT tokens** for session management
- **Role-based access control**

### Available Roles

- **super_admin** - Full system access
- **admin** - Content and user management
- **editor** - Content management
- **author** - Own content management
- **contributor** - Content creation
- **subscriber** - Read-only access

## 📝 Content Management

### Posts and Pages

- **Rich text editor** with TipTap
- **Image uploads** and media management
- **Categories and tags** for organization
- **SEO optimization** with meta fields
- **Draft/published** status
- **Scheduled publishing**

### Admin Dashboard

- **Overview statistics**
- **Content management**
- **User management**
- **Media library**
- **Settings configuration**
- **Plugin/theme management**

## 🔌 Plugin System

The application supports a robust plugin system:

```typescript
// Example plugin usage
import { BasePlugin } from "@vyral/plugin-sdk";

export class MyPlugin extends BasePlugin {
  config = {
    name: "my-plugin",
    version: "1.0.0",
    description: "My awesome plugin",
  };

  protected registerHooks() {
    this.registerHook("post:before-render", async (post) => {
      // Modify post before rendering
      return post;
    });
  }
}
```

## 🎨 Theme System

Themes can customize the entire look and feel:

```json
{
  "name": "my-theme",
  "version": "1.0.0",
  "description": "Custom theme",
  "templates": [
    {
      "name": "Homepage",
      "file": "index.tsx",
      "type": "page"
    }
  ]
}
```

## 🔍 SEO Features

- **Meta tags** for all pages
- **Open Graph** support
- **Twitter Cards**
- **JSON-LD** structured data
- **Sitemap** generation
- **Robots.txt** configuration

## 📱 API Routes

The application provides RESTful API endpoints:

- `GET /api/posts` - List posts
- `POST /api/posts` - Create post
- `GET /api/posts/[id]` - Get post
- `PUT /api/posts/[id]` - Update post
- `DELETE /api/posts/[id]` - Delete post

## 🧪 Development

```bash
# Development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Building for production
npm run build

# Start production server
npm run start
```

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Add environment variables
3. Deploy automatically on push

### Docker

```bash
# Build image
docker build -t vyral-cms .

# Run container
docker run -p 3000:3000 -e MONGODB_URI="..." vyral-cms
```

### Traditional Hosting

```bash
# Build for production
npm run build

# Start production server
npm run start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation:** [docs.vyral.com](https://docs.vyral.com)
- **Issues:** [GitHub Issues](https://github.com/vyral/vyral-cms/issues)
- **Discord:** [Join our community](https://discord.gg/vyral)

---

Built with ❤️ by the Vyral team
