import type { NextConfig } from "next";
const config: NextConfig = {
  turbopack: { root: process.cwd() },
  serverExternalPackages: ["exceljs", "sharp", "undici"],
  async redirects() {
    return [{ source: "/train", destination: "/config", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/brand/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/auth/callback",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};
export default config;
