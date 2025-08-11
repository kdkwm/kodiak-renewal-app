# Deployment Guide

## Quick Deploy to Vercel

1. **Install Vercel CLI:**
   \`\`\`bash
   npm install -g vercel
   \`\`\`

2. **Deploy:**
   \`\`\`bash
   vercel
   \`\`\`

3. **Add Custom Domain:**
   - Go to Vercel dashboard
   - Project Settings → Domains
   - Add: `renewal.yourdomain.com`

4. **DNS Setup:**
   \`\`\`
   Type: CNAME
   Name: renewal
   Value: cname.vercel-dns.com
   \`\`\`

## Test URLs

### KSR Company (Bambora):
\`\`\`
https://your-domain.com?contract_subtotal=450&service_address=123%20Main%20Street&company=KSR&contract_id=KSR-2025-001&is_platinum=false&is_walkway=true
\`\`\`

### KSB Company (PayPal):
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
