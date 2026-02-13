/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@apex/config",
    "@apex/auth",
    "@apex/ui",
    "@apex/utils",
  ],
};

module.exports = nextConfig;
