export const SESSION_COOKIE_NAME = "swepack_session";
export const GITHUB_STATE_COOKIE_NAME = "swepack_github_state";
export const GITHUB_LINK_COOKIE_NAME = "swepack_github_link";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
export const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

export function secureCookieOptions(maxAge: number, path = "/") {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path,
    maxAge,
  };
}

export function clearCookieOptions(path = "/") {
  return {
    ...secureCookieOptions(0, path),
    expires: new Date(0),
  };
}

export function backendApiUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_API_URL ??
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3001"
      : undefined);
  if (!configuredUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is required to reach the backend API.");
  }
  const url = new URL(configuredUrl);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_API_URL must use HTTPS in production.");
  }
  return url.toString().replace(/\/+$/, "");
}

export function hasExpectedOrigin(request: Request) {
  const expectedOrigin =
    process.env.FRONTEND_URL ??
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : undefined);
  return Boolean(expectedOrigin && request.headers.get("origin") === expectedOrigin);
}
