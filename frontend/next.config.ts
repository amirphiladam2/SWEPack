import type { NextConfig } from "next";

if (process.env.NODE_ENV === "production") {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is required for production builds.");
  }
  if (new URL(apiUrl).protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_API_URL must use HTTPS in production.");
  }
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    const localApiSources =
      process.env.NODE_ENV === "development"
        ? " http://localhost:3001 http://127.0.0.1:3001"
        : "";

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: https:; connect-src 'self' https:${localApiSources}; object-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
