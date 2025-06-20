import os

def create_directory(path):
    os.makedirs(path, exist_ok=True)

def create_file(path):
    with open(path, 'w') as f:
        pass

# Define base path
base_path = "apps/web/modules/s3-storage-module"

# Create main directory
create_directory(base_path)

# Create main files
create_file(os.path.join(base_path, "package.json"))
create_file(os.path.join(base_path, "manifest.json"))
create_file(os.path.join(base_path, "index.js"))
create_file(os.path.join(base_path, "install.js"))
create_file(os.path.join(base_path, "uninstall.js"))
create_file(os.path.join(base_path, "README.md"))
create_file(os.path.join(base_path, "icon.png"))
create_file(os.path.join(base_path, "screenshot1.png"))
create_file(os.path.join(base_path, "screenshot2.png"))

# Create config directory and files
config_path = os.path.join(base_path, "config")
create_directory(config_path)
create_file(os.path.join(config_path, "providers.json"))
create_file(os.path.join(config_path, "defaults.json"))

# Create services directory and files
services_path = os.path.join(base_path, "services")
create_directory(services_path)
create_file(os.path.join(services_path, "s3-storage-service.js"))
create_file(os.path.join(services_path, "provider-factory.js"))
create_file(os.path.join(services_path, "file-manager.js"))
create_file(os.path.join(services_path, "url-service.js"))

# Create providers directory and files
providers_path = os.path.join(base_path, "providers")
create_directory(providers_path)
create_file(os.path.join(providers_path, "aws-s3.js"))
create_file(os.path.join(providers_path, "vultr-storage.js"))
create_file(os.path.join(providers_path, "cloudflare-r2.js"))
create_file(os.path.join(providers_path, "digitalocean-spaces.js"))
create_file(os.path.join(providers_path, "linode-storage.js"))
create_file(os.path.join(providers_path, "base-provider.js"))

# Create utils directory and files
utils_path = os.path.join(base_path, "utils")
create_directory(utils_path)
create_file(os.path.join(utils_path, "validators.js"))
create_file(os.path.join(utils_path, "file-utils.js"))
create_file(os.path.join(utils_path, "mime-helper.js"))
create_file(os.path.join(utils_path, "error-handler.js"))

# Create middleware directory and files
middleware_path = os.path.join(base_path, "middleware")
create_directory(middleware_path)
create_file(os.path.join(middleware_path, "storage-interceptor.js"))
create_file(os.path.join(middleware_path, "upload-handler.js"))

# Create admin directory and files
admin_path = os.path.join(base_path, "admin")
create_directory(admin_path)
create_file(os.path.join(admin_path, "settings-panel.js"))
create_file(os.path.join(admin_path, "storage-stats.js"))
create_file(os.path.join(admin_path, "migration-tool.js"))
create_file(os.path.join(admin_path, "test-connection.js"))

# Create api directory and files
api_path = os.path.join(base_path, "api")
create_directory(api_path)
create_file(os.path.join(api_path, "upload.js"))
create_file(os.path.join(api_path, "delete.js"))
create_file(os.path.join(api_path, "migrate.js"))
create_file(os.path.join(api_path, "test-connection.js"))
create_file(os.path.join(api_path, "settings.js"))

# Create hooks directory and files
hooks_path = os.path.join(base_path, "hooks")
create_directory(hooks_path)
create_file(os.path.join(hooks_path, "media-upload.js"))
create_file(os.path.join(hooks_path, "media-delete.js"))
create_file(os.path.join(hooks_path, "url-generation.js"))

print(f"Folder structure and empty files created successfully at {base_path}")