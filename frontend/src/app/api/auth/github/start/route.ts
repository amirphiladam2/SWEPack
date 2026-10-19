import { NextResponse } from "next/server";
import {
  backendApiUrl,
  clearCookieOptions,
  GITHUB_LINK_COOKIE_NAME,
  GITHUB_STATE_COOKIE_NAME,
  OAUTH_STATE_MAX_AGE_SECONDS,
  secureCookieOptions,
} from "@/lib/auth-cookies";

export const dynamic = "force-dynamic";

function loginRedirect(error: string) {
  const origin =
    process.env.FRONTEND_URL ??
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : undefined);
  if (!origin) {
    return NextResponse.json(
      { message: "FRONTEND_URL is required for GitHub sign-in." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
  const url = new URL("/login", origin);
  url.searchParams.set("oauth", error);
  const response = NextResponse.redirect(url, 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET() {
  try {
    const response = await fetch(`${backendApiUrl()}/auth/github/authorize`, {
      cache: "no-store",
    });
    if (!response.ok) return loginRedirect("unavailable");

    const result = (await response.json()) as {
      state?: unknown;
      authorizationUrl?: unknown;
    };
    if (
      typeof result.state !== "string" ||
      typeof result.authorizationUrl !== "string"
    ) {
      return loginRedirect("failed");
    }
    const authorizationUrl = new URL(result.authorizationUrl);
    if (
      authorizationUrl.protocol !== "https:" ||
      authorizationUrl.hostname !== "github.com"
    ) {
      return loginRedirect("failed");
    }

    const redirect = NextResponse.redirect(authorizationUrl, 303);
    redirect.headers.set("Cache-Control", "no-store");
    redirect.cookies.set(
      GITHUB_LINK_COOKIE_NAME,
      "",
      clearCookieOptions("/api/auth/github/callback"),
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
    return loginRedirect("unavailable");
  }
}
