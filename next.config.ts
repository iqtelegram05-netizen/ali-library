import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Silence Turbopack webpack config warning
  turbopack: {
    resolveAlias: {
      canvas: { browser: '' },
    },
  },
  // Webpack fallback for PDF.js worker
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve = {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          canvas: false,
        },
      };
    }
    return config;
  },
  allowedDevOrigins: [
    "https://preview-chat-91a44780-b7cd-4224-b117-dc0b2b8961d0.space.z.ai",
    "https://*.space.chatglm.site",
    "https://*.space.z.ai",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.image2url.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

