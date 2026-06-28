import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow slow IMAP sync requests more time before proxy closes connection
  httpAgentOptions: {
    keepAlive: true,
  },
  experimental: {
    proxyTimeout: 120_000, // 120 seconds for long-running IMAP sync calls
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
