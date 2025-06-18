import os

def create_analytics_plugin_structure(base_path="plugins/analytics-plugin"):
    # Define the folder structure
    folders = [
        "src",
        "src/components",
        "src/services",
        "src/types"
    ]
    
    # Define the files to be created
    files = {
        "package.json": "",
        "plugin.config.json": "",
        "src/index.ts": "",
        "src/components/AnalyticsDashboard.tsx": "",
        "src/components/AnalyticsSettings.tsx": "",
        "src/components/AnalyticsWidget.tsx": "",
        "src/services/tracker.ts": "",
        "src/services/aggregator.ts": "",
        "src/services/reports.ts": "",
        "src/types/analytics.ts": ""
    }
    
    # Create base directory
    os.makedirs(base_path, exist_ok=True)
    
    # Create all folders
    for folder in folders:
        os.makedirs(os.path.join(base_path, folder), exist_ok=True)
    
    # Create all files
    for file_path, content in files.items():
        full_path = os.path.join(base_path, file_path)
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
    
    print(f"Analytics plugin structure created successfully at {base_path}")

if __name__ == "__main__":
    create_analytics_plugin_structure()