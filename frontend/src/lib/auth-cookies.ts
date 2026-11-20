export const SESSION_COOKIE_NAME = "swepack_session";
export const GITHUB_STATE_COOKIE_NAME = "swepack_github_state";
export const GITHUB_LINK_COOKIE_NAME = "swepack_github_link";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
export const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

import service from "../../service.mjs";

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
  const configuredUrl = service.input().apiUrl;
  const url = new URL(configuredUrl);
  return url.toString().replace(/\/+$/, "");
}

export function hasExpectedOrigin(request: Request) {
  const expectedOrigin = service.input().frontendUrl;
  return Boolean(expectedOrigin && request.headers.get("origin") === expectedOrigin);
}
