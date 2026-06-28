import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML export when building for production (served directly by FastAPI)
  ...(process.env.NODE_ENV === "production" ? { output: "export" } : {}),

  // Allow slow IMAP sync requests more time before proxy closes connection
  httpAgentOptions: {
    keepAlive: true,
  },
  experimental: {
    proxyTimeout: 120_000, // 120 seconds for long-running IMAP sync calls
  },

  // Rewrites are only active in development for proxying requests from port 3000 to port 8000
  ...(process.env.NODE_ENV !== "production"
    ? {
        async rewrites() {
          const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";
          return [
            {
              source: "/api/:path*",
              destination: `${backendUrl}/api/:path*`,
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;

