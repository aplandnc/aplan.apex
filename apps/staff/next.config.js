/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      enabled: true,
    },
  },

  // ✅ monorepo workspace 패키지 transpile
  transpilePackages: [
    "@apex/config",
    "@apex/auth",
    "@apex/ui",
  ],
};

module.exports = nextConfig;
