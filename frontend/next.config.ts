import type { NextConfig } from "next";

if (process.env.NODE_ENV === "production") {
  // On Prisma Compute these values are runtime service inputs, not build-time
  // environment variables; the guards below only warn so the build can run.
  if (!process.env.NEXT_PUBLIC_API_URL) {
    console.warn("NEXT_PUBLIC_API_URL is not set at build time.");
  } else if (new URL(process.env.NEXT_PUBLIC_API_URL).protocol !== "https:") {
    console.warn("NEXT_PUBLIC_API_URL should use HTTPS in production.");
  }
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl || new URL(frontendUrl).protocol !== "https:") {
    console.warn("FRONTEND_URL should be set to the HTTPS frontend origin.");
  }
  for (const name of [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  ]) {
    if (!process.env[name]) {
      console.warn(`${name} is not set for production Firebase auth.`);
    }
  }
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
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
