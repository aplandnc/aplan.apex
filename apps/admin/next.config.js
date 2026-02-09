/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['@apex/auth', '@apex/config', '@apex/ui'],
}

module.exports = nextConfig
