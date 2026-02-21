const pkg = require("./package.json");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || pkg.version,
  },
  // Avoid Terser unicode error in dependency code (minification disabled for prod)
  webpack: (config, { dev }) => {
    if (!dev) {
      config.optimization.minimize = false;
    }
    return config;
  },
};

module.exports = nextConfig;
