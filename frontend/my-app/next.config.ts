import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true, //eslint 관련 에러 무시하자~
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      if (config.optimization && Array.isArray(config.optimization.minimizer)) {
        config.optimization.minimizer.forEach((minimizer: any) => {
          if (
            minimizer.constructor.name === 'TerserPlugin' &&
            minimizer.options
          ) {
            if (Array.isArray(minimizer.options.exclude)) {
              minimizer.options.exclude.push(/react-signature-canvas/);
            } else {
              minimizer.options.exclude = [/react-signature-canvas/];
            }
          }
        });
      }
    }
    return config;
  },
};

export default nextConfig;
