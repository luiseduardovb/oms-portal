import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const apiUrl = process.env.OMS_API_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The browser talks to this server only (/api/...), which forwards to the
  // API. No CORS, and the API address stays out of the browser bundle.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/:path*` }];
  },
};

export default withNextIntl(nextConfig);
