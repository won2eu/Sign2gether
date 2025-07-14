import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true, //eslint 관련 에러 무시하자~
  },
};

export default nextConfig;
