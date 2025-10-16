/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client'],
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    })
    return config
  },
  // Turbopack configuration (now stable)
  turbopack: {
    rules: {
      // Use glob patterns instead of file extensions
      '*.svg': ['@svgr/webpack'],
      '*.md': ['raw-loader'],
    },
  },
  // Experimental features
  experimental: {
    esmExternals: true, // To handle ES modules
  },
};

module.exports = nextConfig; 