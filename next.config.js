// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'yt3.ggpht.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },
  env: {
    NEXT_PUBLIC_CHANNEL_ID: process.env.CHANNEL_ID,
  },
  eslint: {
    // Optional: skip lint during build (only if you lint separately)
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;