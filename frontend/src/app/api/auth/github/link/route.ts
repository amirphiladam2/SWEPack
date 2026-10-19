import { NextRequest, NextResponse } from "next/server";
import {
  backendApiUrl,
  GITHUB_LINK_COOKIE_NAME,
  GITHUB_STATE_COOKIE_NAME,
  hasExpectedOrigin,
  OAUTH_STATE_MAX_AGE_SECONDS,
  secureCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth-cookies";

export const dynamic = "force-dynamic";

function loginRedirect(oauth: string) {
  const origin =
    process.env.FRONTEND_URL ??
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : undefined);
  if (!origin) {
    return NextResponse.json(
      { message: "FRONTEND_URL is required for GitHub account linking." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
  const url = new URL("/login", origin);
  url.searchParams.set("oauth", oauth);
  const response = NextResponse.redirect(url, 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest) {
  if (!hasExpectedOrigin(request)) {
    return NextResponse.json(
      { message: "The request origin is not allowed." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return loginRedirect("expired");

  try {
    const response = await fetch(
      `${backendApiUrl()}/auth/github/authorize-link`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    if (!response.ok) {
      return loginRedirect(response.status === 401 ? "expired" : "link_failed");
    }

    const result = (await response.json()) as {
      state?: unknown;
      authorizationUrl?: unknown;
    };
    if (
      typeof result.state !== "string" ||
      typeof result.authorizationUrl !== "string"
    ) {
      return loginRedirect("link_failed");
    }
    const authorizationUrl = new URL(result.authorizationUrl);
    if (
      authorizationUrl.protocol !== "https:" ||
      authorizationUrl.hostname !== "github.com"
    ) {
      return loginRedirect("link_failed");
    }

    const redirect = NextResponse.redirect(authorizationUrl, 303);
    redirect.headers.set("Cache-Control", "no-store");
    redirect.cookies.set(
      GITHUB_LINK_COOKIE_NAME,
      "true",
      secureCookieOptions(
        OAUTH_STATE_MAX_AGE_SECONDS,
        "/api/auth/github/callback",
      ),
    );
    redirect.cookies.set(
      GITHUB_STATE_COOKIE_NAME,
      result.state,
      secureCookieOptions(
        OAUTH_STATE_MAX_AGE_SECONDS,
        "/api/auth/github/callback",
      ),
    );
    return redirect;
  } catch {
    return loginRedirect("link_failed");
  }
}
