import type { NextConfig } from "next";

const isDesktopExport = process.env.CHECKTASK_DESKTOP === "1";

const desktopConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  staticPageGenerationTimeout: 120,
  experimental: {
    workerThreads: true,
    turbopackPluginRuntimeStrategy: "workerThreads",
    webpackBuildWorker: false,
    staticGenerationRetryCount: 1,
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 1000,
  },
};

const webConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

const nextConfig: NextConfig = isDesktopExport ? desktopConfig : webConfig;

export default nextConfig;
