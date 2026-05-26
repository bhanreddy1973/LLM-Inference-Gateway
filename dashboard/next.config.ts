import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8000";
    return [
      {
        source: "/api/gateway/:path*",
        destination: `${gatewayUrl}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
