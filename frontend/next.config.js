const backendUrl = (
  process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://tracemyassets.com"
).replace(/\/+$/, "");
const siteHost = new URL(siteUrl).host;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,

  // One address for the site: www.<domain> goes to <domain> with a 301.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: `www.${siteHost}` }],
        destination: `${siteUrl}/:path*`,
        permanent: true,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;