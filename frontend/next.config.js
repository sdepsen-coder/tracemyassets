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

  // Basic security headers on every response. Not set on purpose: a
  // Content-Security-Policy (the payment window, Google fonts and sign-in,
  // analytics and Sentry need a carefully tested allow-list first).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Browsers only use https for this site for a year.
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Other sites cannot show ours inside a frame.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Keeps pop-ups (such as a payment step) working while isolating
          // the page from other sites' windows.
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

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