/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Allow access from local network
  // Note: Next.js only supports string arrays, not regex
  // Add your specific IPs here, or use wildcard '*' for development
  experimental: {
    allowedDevOrigins: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:18080',
      'http://127.0.0.1:18080',
      'http://10.42.80.169:3000', // Your current IP
      'http://10.135.80.17:3000',
      'http://192.168.1.100:3000',
      'http://192.168.0.100:3000',
      'http://10.42.80.169:3001',
      'http://10.135.80.17:3001',
      'http://192.168.1.100:3001',
      'http://192.168.0.100:3001',
      // Add more IPs as needed for testing
    ],
  },
  serverExternalPackages: [],
}

export default nextConfig
