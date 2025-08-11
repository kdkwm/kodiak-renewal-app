/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['placeholder.svg'],
    unoptimized: true,
  },
  // Netlify-specific optimizations
  trailingSlash: false,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_PAYPAL_CLIENT_ID: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
    BAMBORA_MERCHANT_ID: process.env.BAMBORA_MERCHANT_ID,
    BAMBORA_API_KEY: process.env.BAMBORA_API_KEY,
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
    PAYPAL_PRODUCT_ID: process.env.PAYPAL_PRODUCT_ID,
  },
}

export default nextConfig
