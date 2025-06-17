# @vyral/core

The core package for Vyral CMS - a modular WordPress alternative built with TypeScript, MongoDB, and modern web technologies.

## Features

- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Database Models**: Mongoose models for all core entities (Posts, Users, Media, etc.)
- **Business Logic**: Service classes implementing CRUD operations and business rules
- **Validation**: Zod-based validation schemas for all data types
- **Caching**: Built-in caching system with tag-based invalidation
- **Error Handling**: Custom error classes with proper HTTP status codes
- **Utilities**: Common utilities for slugification, file handling, encryption, etc.

## Installation

```bash
npm install @vyral/core
```

## Quick Start

```typescript
import { Database, PostService, UserService } from '@vyral/core';

// Initialize database connection
const db = Database.getInstance();
await db.connect({
  uri: 'mongodb://localhost:27017/vyral_cms'
});

// Initialize services
const postService = new PostService();
const userService = new UserService('your-jwt-secret');

// Create a new post
const post = await postService.createPost({
  title: 'Hello World',
  content: 'This is my first post!',
  status: 'published',
  author: 'user-id',
  type: 'post'
});

// Get published posts with pagination
const result = await postService.getPublishedPosts({
  page: 1,
  limit: 10
});

console.log(result.data); // Array of posts
console.log(result.pagination); // Pagination info
```

## Core Types

### Content Types

```typescript
import { Post, Category, Tag, Comment } from '@vyral/core/types';

// Create a post
const postData: Partial<Post> = {
  title: 'My Post',
  slug: 'my-post',
  content: 'Post content here...',
  status: 'published',
  type: 'post',
  author: 'user-id'
};
```

### User Types

```typescript
import { User, UserPreferences } from '@vyral/core/types';

// Create a user
const userData: Partial<User> = {
  username: 'johndoe',
  email: 'john@example.com',
  password: 'secure-password',
  displayName: 'John Doe',
  role: 'author'
};
```

### Media Types

```typescript
import { Media, MediaFolder } from '@vyral/core/types';

// Upload media
const mediaData: Partial<Media> = {
  filename: 'image.jpg',
  originalName: 'my-image.jpg',
  mimeType: 'image/jpeg',
  size: 1024000,
  path: '/uploads/image.jpg',
  url: 'https://example.com/uploads/image.jpg',
  uploadedBy: 'user-id'
};
```

## Services

### PostService

```typescript
import { PostService } from '@vyral/core';

const postService = new PostService();

// Create post
const post = await postService.createPost(postData);

// Get post by slug
const post = await postService.getPostBySlug('my-post-slug');

// Get published posts with filters
const posts = await postService.getPublishedPosts(
  { page: 1, limit: 10 },
  { category: 'tech', search: 'javascript' }
);

// Update post
const updatedPost = await postService.updatePost(postId, updateData);

// Delete post
await postService.deletePost(postId);

// Get related posts
const relatedPosts = await postService.getRelatedPosts(postId, 5);
```

### UserService

```typescript
import { UserService } from '@vyral/core';

const userService = new UserService('jwt-secret');

// Create user
const user = await userService.createUser(userData);

// Authenticate user
const { user, token } = await userService.authenticateUser('username', 'password');

// Get user by ID
const user = await userService.getUserById(userId);

// Update preferences
await userService.updateUserPreferences(userId, preferences);

// Change password
await userService.changePassword(userId, currentPassword, newPassword);

// Verify email
await userService.verifyEmail(userId);
```

## Database Connection

```typescript
import { Database } from '@vyral/core';

const db = Database.getInstance();

// Connect to MongoDB
await db.connect({
  uri: 'mongodb://localhost:27017/vyral_cms',
  options: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000
  }
});

// Check connection status
if (db.isConnectionReady()) {
  console.log('Database connected');
}

// Disconnect
await db.disconnect();
```

## Validation

```typescript
import { validateData, PostSchema } from '@vyral/core';

try {
  const validatedPost = validateData(PostSchema, postData);
  // Data is valid and typed
} catch (error) {
  // Handle validation errors
  console.error(error.message);
}
```

## Caching

```typescript
import { CacheManager } from '@vyral/core';

const cache = CacheManager.getInstance();

// Set cache with TTL
await cache.set('key', data, 3600); // 1 hour

// Get from cache
const data = await cache.get('key');

// Delete cache
await cache.delete('key');

// Delete by pattern
await cache.deleteByPattern('posts:*');

// Delete by tag
await cache.deleteByTag('posts');
```

## Error Handling

```typescript
import { 
  NotFoundError, 
  ValidationError, 
  UnauthorizedError,
  ConflictError 
} from '@vyral/core';

try {
  const post = await postService.getPostBySlug('non-existent');
} catch (error) {
  if (error instanceof NotFoundError) {
    // Handle not found
    console.log(error.message); // "Post with slug non-existent not found"
    console.log(error.statusCode); // 404
  }
}
```

## Utilities

### File Utilities

```typescript
import { 
  validateFile, 
  generateUniqueFilename, 
  humanFileSize,
  getFileExtension 
} from '@vyral/core';

// Validate file
const validation = validateFile(file, {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedExtensions: ['jpg', 'png', 'gif']
});

if (!validation.valid) {
  console.log(validation.errors);
}

// Generate unique filename
const filename = generateUniqueFilename('image.jpg');

// Human readable file size
const size = humanFileSize(1024000); // "1000 KB"
```

### Slug Utilities

```typescript
import { createSlug, createUniqueSlug } from '@vyral/core';

// Create slug
const slug = createSlug('Hello World!'); // "hello-world"

// Create unique slug
const uniqueSlug = await createUniqueSlug(
  'Hello World',
  async (slug) => {
    const exists = await PostModel.exists({ slug });
    return !!exists;
  }
);
```

### Encryption Utilities

```typescript
import { 
  generateToken, 
  generateApiKey, 
  encrypt, 
  decrypt 
} from '@vyral/core';

// Generate random token
const token = generateToken(32);

// Generate API key
const apiKey = generateApiKey(); // "vk_..."

// Encrypt/decrypt data
const key = 'your-encryption-key-32-characters!';
const encrypted = encrypt('sensitive data', key);
const decrypted = decrypt(encrypted, key);
```

## Constants

```typescript
import { 
  DEFAULT_PAGINATION,
  CACHE_TTL,
  UPLOAD_LIMITS,
  USER_PERMISSIONS,
  ROLE_PERMISSIONS 
} from '@vyral/core';

// Use predefined constants
const limit = DEFAULT_PAGINATION.limit; // 10
const cacheTTL = CACHE_TTL.SHORT; // 300 seconds
const maxFileSize = UPLOAD_LIMITS.MAX_FILE_SIZE; // 10MB
const permissions = ROLE_PERMISSIONS.admin; // Array of permissions
```

## TypeScript Support

The package is fully typed with TypeScript. All models, services, and utilities have comprehensive type definitions.

```typescript
// Types are automatically inferred
const posts = await postService.getPublishedPosts(); // posts is typed as PaginationResult<PostDocument>
const user = await userService.getUserById('123'); // user is typed as UserDocument | null
```

## Environment Variables

```env
# Required for JWT functionality
JWT_SECRET=your-super-secret-jwt-key

# MongoDB connection
MONGODB_URI=mongodb://localhost:27017/vyral_cms

# Optional: Cache settings
CACHE_TTL_SHORT=300
CACHE_TTL_MEDIUM=1800
CACHE_TTL_LONG=3600
```

## License

MIT License - see LICENSE file for details.