/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.susercontent.com' },
      { protocol: 'https', hostname: '**.shopee.co.id' },
      { protocol: 'https', hostname: '**.shopee.com' },
    ],
  },
};

module.exports = nextConfig;
