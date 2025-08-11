#!/bin/bash
# Deployment script for Vercel

echo "🚀 Deploying Contract Renewal System to Vercel..."

# Install Vercel CLI if not installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy to Vercel
echo "Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "📝 Next steps:"
echo "1. Go to Vercel dashboard"
echo "2. Add custom domain: renewal.yourdomain.com"
echo "3. Update DNS with CNAME record"
echo "4. Test with: https://your-app.vercel.app?contract_subtotal=450&company=KSR"
