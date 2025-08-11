#!/bin/bash

echo "🚀 Deploying Contract Renewal System to Netlify..."

# Install Netlify CLI if not installed
if ! command -v netlify &> /dev/null; then
    echo "Installing Netlify CLI..."
    npm install -g netlify-cli
fi

# Build the project
echo "Building project..."
npm run build

# Deploy to Netlify
echo "Deploying to Netlify..."
netlify deploy --prod --dir=.next

echo "✅ Deployment complete!"
echo "📝 Next steps:"
echo "1. Go to Netlify dashboard"
echo "2. Add your custom domain"
echo "3. Set up environment variables"
echo "4. Test your deployment"
