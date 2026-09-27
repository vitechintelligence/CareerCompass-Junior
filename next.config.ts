import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "career-compass-junior-lake.vercel.app",
          },
        ],
        destination: "https://career-compass-junior-vitech.vercel.app/:path*",
        permanent: true,
      },
    ];
  },
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/interactive-books/*": ["./public/interactive-book-data/**/*", "./content/interactive-books/**/*"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "cookie",
            key: "ccj_lti_frame_host",
            value: "(?<ltiFrameHost>[A-Za-z0-9.-]{1,253})",
          },
        ],
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://:ltiFrameHost",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
