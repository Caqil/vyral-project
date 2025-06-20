# S3 Storage Module for Vyral CMS

A comprehensive S3-compatible storage module that allows Vyral CMS to store files on various cloud storage providers instead of local filesystem. Supports AWS S3, Cloudflare R2, Vultr Object Storage, DigitalOcean Spaces, Linode Object Storage, and any S3-compatible service.

## 🌟 Features

### 🔗 **Multi-Provider Support**

- **AWS S3** - Industry standard with full feature set
- **Cloudflare R2** - Zero egress fees with global CDN
- **Vultr Object Storage** - Cost-effective with integrated CDN
- **DigitalOcean Spaces** - Developer-friendly with built-in CDN
- **Linode Object Storage** - Simple pricing and reliable performance
- **Custom S3-Compatible** - Support for any S3-compatible service

### 📁 **Advanced File Management**

- Automatic file organization with customizable folder structures
- Image optimization and compression
- Multiple file format support
- File validation and security scanning
- Duplicate detection and handling

### 🚀 **Performance Optimization**

- CDN integration for global file delivery
- Automatic cache header optimization
- Image variant generation (thumbnails, responsive sizes)
- Lazy loading and progressive delivery

### 🔧 **Admin Tools**

- Intuitive configuration interface
- Real-time connection testing
- Storage usage analytics
- Migration tools (local ↔ S3)
- Bulk file operations

### 🔒 **Security & Reliability**

- Secure credential storage
- Private file support with signed URLs
- File access permissions
- Backup to secondary providers
- Error handling and retry logic

## 📦 Installation

### 1. Install the Module

```bash
# Navigate to your Vyral CMS modules directory
cd apps/web/modules/

# Create the s3-storage-module directory
mkdir s3-storage-module

# Copy all module files to the directory
cp -r /path/to/s3-storage-module/* s3-storage-module/

# Install dependencies
cd s3-storage-module
npm install
```

### 2. Register with Vyral CMS

```bash
# Run the installation script
npm run postinstall

# Or manually register the module
node install.js
```

### 3. Activate in Admin Panel

1. Go to **Admin → Modules**
2. Find **S3 Storage Module**
3. Click **Activate**
4. Configure your storage provider

## ⚙️ Configuration

### Basic Setup

1. **Navigate to Settings**

   - Admin Panel → Settings → S3 Storage

2. **Select Provider**

   - Choose your preferred storage provider
   - Each provider has specific requirements

3. **Configure Credentials**

   - Enter your provider-specific credentials
   - Test connection before saving

4. **Optimize Settings**
   - Configure image optimization
   - Set up folder organization
   - Enable features like CDN and backups

### Provider-Specific Setup

#### AWS S3

```json
{
  "storage_provider": "aws-s3",
  "aws_access_key_id": "AKIA...",
  "aws_secret_access_key": "...",
  "aws_region": "us-east-1",
  "bucket_name": "my-cms-files",
  "public_url": "https://my-cdn-domain.com"
}
```

**Setup Steps:**

1. Create an S3 bucket in AWS Console
2. Create IAM user with S3 permissions
3. Generate access keys
4. Configure bucket policy for public access (if needed)
5. Optional: Set up CloudFront CDN

**Required Permissions:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

#### Cloudflare R2

```json
{
  "storage_provider": "cloudflare-r2",
  "aws_access_key_id": "...",
  "aws_secret_access_key": "...",
  "cloudflare_account_id": "...",
  "bucket_name": "my-cms-files",
  "r2_dev_subdomain": "my-files",
  "public_url": "https://files.mysite.com"
}
```

**Setup Steps:**

1. Create R2 bucket in Cloudflare Dashboard
2. Generate R2 API tokens
3. Set up custom domain (recommended)
4. Configure R2.dev subdomain for testing

#### Vultr Object Storage

```json
{
  "storage_provider": "vultr-storage",
  "aws_access_key_id": "...",
  "aws_secret_access_key": "...",
  "aws_region": "ewr1",
  "bucket_name": "my-cms-files"
}
```

**Available Regions:**

- `ewr1` - New Jersey (East Coast US)
- `sjc1` - Silicon Valley (West Coast US)
- `ams1` - Amsterdam (Europe)

#### DigitalOcean Spaces

```json
{
  "storage_provider": "digitalocean-spaces",
  "aws_access_key_id": "...",
  "aws_secret_access_key": "...",
  "aws_region": "nyc3",
  "bucket_name": "my-cms-files",
  "enable_cdn": true
}
```

**Available Regions:**

- `nyc3` - New York 3
- `ams3` - Amsterdam 3
- `sgp1` - Singapore 1
- `fra1` - Frankfurt 1
- `lon1` - London 1

#### Linode Object Storage

```json
{
  "storage_provider": "linode-storage",
  "aws_access_key_id": "...",
  "aws_secret_access_key": "...",
  "aws_region": "us-east-1",
  "bucket_name": "my-cms-files"
}
```

## 🛠️ Advanced Configuration

### Image Optimization

```json
{
  "auto_optimize_images": true,
  "image_quality": 85,
  "max_image_width": 2048,
  "max_image_height": 2048
}
```

### Folder Organization

```json
{
  "folder_structure": "date-based",
  "custom_folder_pattern": "{year}/{month}/{type}/"
}
```

**Available Structures:**

- `flat` - All files in root
- `date-based` - Organized by date (YYYY/MM/)
- `type-based` - Organized by file type
- `user-based` - Organized by user
- `custom` - Custom pattern

### Backup Configuration

```json
{
  "backup_to_secondary": true,
  "secondary_provider": "cloudflare-r2",
  "backup_access_key_id": "...",
  "backup_secret_access_key": "..."
}
```

### Private Files

```json
{
  "private_files_support": true,
  "signed_url_expiry": 60
}
```

## 🚀 Usage

### Upload Files

The module automatically intercepts file uploads and redirects them to S3:

```javascript
// Standard Vyral CMS file upload - automatically uses S3
const uploadResult = await mediaApi.uploadFile(file, {
  alt: "Image description",
  caption: "Image caption",
  tags: ["tag1", "tag2"],
});
```

### Generate URLs

```javascript
// Public file URL
const publicUrl = await s3Module.urlService.generateUrl("path/to/file.jpg");

// Private file URL (signed)
const privateUrl = await s3Module.urlService.generateUrl(
  "path/to/private.pdf",
  {
    isPrivate: true,
    expiresIn: 3600, // 1 hour
  }
);

// Download URL
const downloadUrl = await s3Module.urlService.generateDownloadUrl(
  provider,
  "path/to/document.pdf",
  "document.pdf"
);
```

### Image Variants

```javascript
// Generate responsive image URLs
const responsiveUrls = s3Module.urlService.generateResponsiveUrls(
  provider,
  "path/to/image.jpg",
  {
    sizes: [300, 600, 900, 1200],
    formats: ["webp", "jpg"],
    quality: 85,
  }
);
```

## 🔄 Migration

### Migrate from Local Storage

The module includes tools to migrate existing files from local storage to S3:

```bash
# Via Admin Panel
# Go to Settings → S3 Storage → Migration Tool

# Via API
POST /api/s3-storage/migrate
{
  "dryRun": false,
  "batchSize": 10
}
```

### Migrate Between Providers

```javascript
// Sync between primary and backup providers
await s3Module.storageService.syncProviders({
  direction: "primary-to-backup",
  dryRun: false,
});
```

## 📊 Analytics & Monitoring

### Storage Statistics

```javascript
// Get detailed storage statistics
const stats = await s3Module.storageService.getStatistics();
```

### Health Monitoring

```bash
# Health check endpoint
GET /api/s3-storage/health

# Module validation
npm run validate
```

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration

# Test S3 connection
npm run connection-test
```

### Test Configuration

```bash
# Test current configuration
curl -X POST /api/s3-storage/test-connection

# Test custom configuration
curl -X POST /api/s3-storage/test-connection \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "aws-s3",
    "aws_access_key_id": "...",
    "aws_secret_access_key": "...",
    "aws_region": "us-east-1",
    "bucket_name": "test-bucket"
  }'
```

## 🔒 Security Considerations

### Credentials Management

- Store credentials securely using environment variables
- Use IAM roles when possible (AWS)
- Rotate access keys regularly
- Use least-privilege principle

### File Security

- Enable private file support for sensitive content
- Use signed URLs with appropriate expiration
- Implement file validation and scanning
- Consider encryption at rest

### Network Security

- Use HTTPS for all transfers
- Configure CORS properly for web uploads
- Implement rate limiting
- Monitor for unusual access patterns

## 🚨 Troubleshooting

### Common Issues

#### Connection Failures

```
Error: S3 connection failed: Invalid access key
```

**Solutions:**

- Verify access key and secret key
- Check IAM permissions
- Ensure bucket exists and is accessible

#### Upload Failures

```
Error: Upload failed: File too large
```

**Solutions:**

- Check file size limits
- Verify bucket has sufficient space
- Review network connectivity

#### URL Generation Issues

```
Error: URL generation failed: Invalid key
```

**Solutions:**

- Verify S3 key format
- Check file exists in bucket
- Review URL service configuration

### Debug Mode

Enable debug logging:

```bash
export S3_LOG_LEVEL=debug
export S3_LOG_FILE=/path/to/s3-storage.log
```

### Getting Help

1. **Check Logs** - Review module logs for error details
2. **Test Connection** - Use built-in connection testing
3. **Documentation** - See provider-specific setup guides
4. **Community** - Join the Vyral CMS Discord for support

## 📈 Performance Optimization

### CDN Setup

Configure CDN for optimal performance:

```json
{
  "public_url": "https://cdn.mysite.com",
  "cdn_domain": "cdn.mysite.com"
}
```

### Cache Configuration

Optimize cache headers:

```json
{
  "cache_control": {
    "images": "public, max-age=31536000",
    "documents": "public, max-age=86400"
  }
}
```

### Image Optimization

Enable automatic optimization:

```json
{
  "auto_optimize_images": true,
  "image_quality": 85,
  "generate_variants": true,
  "variants": [
    { "name": "thumbnail", "width": 150, "height": 150 },
    { "name": "medium", "width": 600, "height": 400 },
    { "name": "large", "width": 1200, "height": 800 }
  ]
}
```

## 💰 Cost Optimization

### Provider Comparison

| Provider      | Storage   | Bandwidth | Best For                        |
| ------------- | --------- | --------- | ------------------------------- |
| AWS S3        | $0.023/GB | $0.09/GB  | Enterprise, Full features       |
| Cloudflare R2 | $0.015/GB | Free      | Cost efficiency, Global CDN     |
| Vultr         | $0.02/GB  | 1TB free  | Simplicity, Affordable          |
| DigitalOcean  | $5/250GB  | 1TB free  | Developers, Predictable pricing |
| Linode        | $0.02/GB  | 1TB free  | Simplicity, Support             |

### Cost Monitoring

```javascript
// Get cost estimates
const estimates = await provider.estimateMonthlyCost(totalBytes);
```

## 🔄 Updates & Maintenance

### Update Module

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Run validation after update
npm run validate
```

### Backup Configuration

Always backup your configuration before updates:

```bash
# Export current configuration
curl -X GET /api/s3-storage/config > s3-config-backup.json
```

## 📄 License

This module is licensed under the MIT License. See LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please see CONTRIBUTING.md for guidelines.

## 📞 Support

- **Documentation**: [Full documentation](https://vyral.com/docs/modules/s3-storage)
- **Issues**: [GitHub Issues](https://github.com/vyral/vyral-cms/issues)
- **Discord**: [Join our community](https://discord.gg/vyral)
- **Email**: hello@vyral.com

---

**Built with ❤️ by the Vyral Team**

Empowering content creators with flexible, scalable storage solutions.
