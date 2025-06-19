import os
import errno

def create_oauth_module_structure(base_path):
    """
    Creates the oauth-module folder structure with all directories and empty files as specified
    Args:
        base_path (str): The base directory where oauth-module will be created
    """
    # Define the folder structure
    structure = {
        'oauth-module': {
            # Root files
            'files': [
                'manifest.json',
                'package.json',
                'index.js',
                'README.md',
                'icon.png'
            ],
            # Subdirectories
            'migrations': {
                'files': [
                    '001_create_oauth_providers.js',
                    '002_create_oauth_tokens.js',
                    '003_add_user_oauth_fields.js'
                ]
            },
            'services': {
                'files': [
                    'oauth-service.js',
                    'provider-service.js',
                    'token-service.js'
                ]
            },
            'providers': {
                'files': [
                    'google.js',
                    'github.js',
                    'facebook.js',
                    'twitter.js',
                    'discord.js',
                    'linkedin.js'
                ]
            },
            'components': {
                'files': [
                    'oauth-button.js',
                    'oauth-list.js',
                    'provider-config.js'
                ]
            },
            'utils': {
                'files': [
                    'crypto.js',
                    'validators.js',
                    'constants.js'
                ]
            }
        }
    }

    def create_structure(current_path, items):
        """
        Recursively creates directories and files
        Args:
            current_path (str): Current directory path
            items (dict): Structure dictionary for current directory
        """
        try:
            # Create current directory
            os.makedirs(current_path, exist_ok=True)

            # Process items
            for key, value in items.items():
                if key == 'files':
                    # Create files
                    for file_name in value:
                        file_path = os.path.join(current_path, file_name)
                        try:
                            with open(file_path, 'w') as f:
                                pass  # Create empty file
                        except IOError as e:
                            print(f"Error creating file {file_path}: {e}")
                else:
                    # Create subdirectory
                    new_path = os.path.join(current_path, key)
                    create_structure(new_path, value)

        except OSError as e:
            print(f"Error creating directory {current_path}: {e}")

    try:
        # Start creating structure
        base_dir = os.path.join(base_path, 'oauth-module')
        create_structure(base_path, structure)
        print(f"OAuth module structure created successfully at {base_dir}")
    except Exception as e:
        print(f"Failed to create OAuth module structure: {e}")

if __name__ == "__main__":
    # Use current working directory as base path
    current_dir = os.getcwd()
    create_oauth_module_structure(current_dir)