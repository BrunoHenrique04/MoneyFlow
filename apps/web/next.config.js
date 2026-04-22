/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@moneyflow/shared'],
  output: process.env.NEXT_BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
}

module.exports = nextConfig
