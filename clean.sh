#!/bin/bash

echo "🧹 Cleaning up unwanted .d.ts and .d.ts.map files..."

# Remove .d.ts files from web app (keep only next-env.d.ts)
echo "Cleaning packages/core..."
find packages/core -name "*.d.ts" -not -name "next-env.d.ts" -not -path "*/node_modules/*" -not -path "*/.next/*" -delete
find packages/core -name "*.d.ts.map" -not -path "*/node_modules/*" -not -path "*/.next/*" -delete

# Remove build info files
find packages/core -name ".tsbuildinfo" -delete

echo "✅ Cleanup complete!"
echo ""
echo "📋 Summary:"
echo "✅ Removed .d.ts files from web app (keeping next-env.d.ts)"
echo "✅ Removed .d.ts.map files from web app" 
echo "✅ Removed .tsbuildinfo files"
echo ""
echo "📦 Packages (ui, core, plugin-sdk) keep their .d.ts files - this is correct!"
echo ""
echo "🚀 Run 'npm run dev' to start development without generating declaration files."