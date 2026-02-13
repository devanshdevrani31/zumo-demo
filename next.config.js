/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingIncludes: {
      '/api/**/*': ['./prisma/dev.db'],
    },
  },
}
module.exports = nextConfig
