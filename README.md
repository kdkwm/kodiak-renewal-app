# Contract Renewal System

A Next.js application for Kodiak Snow Removal contract renewals with integrated payment processing.

## Features

- Multi-step renewal process
- Platinum service upgrades
- Payment scheduling (full payment or installments)
- Integrated payment processing (Bambora for KSR, PayPal for KSB)
- eTransfer option
- Responsive design

## Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/contract-renewal-system)

## Manual Setup

1. **Clone the repository:**
   \`\`\`bash
   git clone https://github.com/yourusername/contract-renewal-system.git
   cd contract-renewal-system
   \`\`\`

2. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up environment variables:**
   Create a `.env.local` file with:
   \`\`\`
   CUSTOM_KEY=your_custom_key
   NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id
   BAMBORA_MERCHANT_ID=your_bambora_merchant_id
   BAMBORA_API_KEY=your_bambora_api_key
   PAYPAL_CLIENT_ID=your_paypal_client_id
   PAYPAL_CLIENT_SECRET=your_paypal_client_secret
   PAYPAL_PRODUCT_ID=your_paypal_product_id
   \`\`\`

4. **Run locally:**
   \`\`\`bash
   npm run dev
   \`\`\`

## Deployment

### Option 1: Deploy via GitHub (Recommended)

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on every push

### Option 2: Direct Deploy

\`\`\`bash
npm install -g vercel
vercel --prod
\`\`\`

## Environment Variables

Add these in your Vercel dashboard under Project Settings → Environment Variables:

| Variable | Description | Required For |
|----------|-------------|--------------|
| `CUSTOM_KEY` | Your custom encryption key | All |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | PayPal client ID (public) | KSB payments |
| `BAMBORA_MERCHANT_ID` | Bambora merchant ID | KSR payments |
| `BAMBORA_API_KEY` | Bambora API key | KSR payments |
| `PAYPAL_CLIENT_ID` | PayPal client ID (server) | KSB payments |
| `PAYPAL_CLIENT_SECRET` | PayPal client secret | KSB payments |
| `PAYPAL_PRODUCT_ID` | PayPal product ID | KSB subscriptions |

## Usage

### URL Parameters

The application accepts these URL parameters:

- `contract_subtotal` - Contract amount (required)
- `service_address` - Service address (required)  
- `company` - KSR or KSB (required)
- `contract_id` - Contract identifier (required)
- `is_platinum` - true/false (optional)
- `is_walkway` - true/false (optional)

### Example URLs

**KSR Company:**
\`\`\`
https://your-domain.com?contract_subtotal=450&service_address=123%20Main%20Street&company=KSR&contract_id=KSR-2025-001&is_platinum=false&is_walkway=true
\`\`\`

**KSB Company:**
\`\`\`
https://your-domain.com?contract_subtotal=380&service_address=456%20Oak%20Avenue&company=KSB&contract_id=KSB-2025-002&is_platinum=true&is_walkway=false
\`\`\`

## WordPress Integration

Add this to your WordPress renewal emails:

\`\`\`php
$renewal_url = "https://renewal.yourdomain.com?" . http_build_query([
    'contract_subtotal' => $contract->subtotal,
    'service_address' => $contract->address,
    'company' => $contract->company,
    'contract_id' => $contract->id,
    'is_platinum' => $contract->is_platinum ? 'true' : 'false',
    'is_walkway' => $contract->is_walkway ? 'true' : 'false'
]);
\`\`\`

## Custom Domain Setup

1. Go to Vercel dashboard → Your project → Settings → Domains
2. Add your custom domain: `renewal.yourdomain.com`
3. Update your DNS with the provided CNAME record

## Support

For issues or questions, contact: info@kodiaksnow.ca
\`\`\`

```shellscript file="scripts/setup-github.sh"
#!/bin/bash

echo "🔧 Setting up GitHub repository for Contract Renewal System..."

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo "Initializing Git repository..."
    git init
fi

# Add all files
echo "Adding files to Git..."
git add .

# Create initial commit
echo "Creating initial commit..."
git commit -m "Initial commit: Contract Renewal System

- Multi-step renewal process
- Payment integration (Bambora/PayPal)
- Responsive design
- Ready for Vercel deployment"

echo "✅ Git repository setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Create a new repository on GitHub"
echo "2. Run: git remote add origin https://github.com/yourusername/contract-renewal-system.git"
echo "3. Run: git branch -M main"
echo "4. Run: git push -u origin main"
echo "5. Connect the repository to Vercel for automatic deployments"
