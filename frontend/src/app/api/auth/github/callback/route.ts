import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  backendApiUrl,
  clearCookieOptions,
  GITHUB_LINK_COOKIE_NAME,
  GITHUB_STATE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  secureCookieOptions,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth-cookies";

export const dynamic = "force-dynamic";

function frontendOrigin() {
  const origin =
    process.env.FRONTEND_URL ??
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : undefined);
  if (!origin) throw new Error("FRONTEND_URL is required for GitHub sign-in.");
  return origin;
}

function finish(oauth: string) {
  const url = new URL("/login", frontendOrigin());
  url.searchParams.set("oauth", oauth);
  const response = NextResponse.redirect(url, 303);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(
    GITHUB_STATE_COOKIE_NAME,
    "",
    clearCookieOptions("/api/auth/github/callback"),
  );
  response.cookies.set(
    GITHUB_LINK_COOKIE_NAME,
    "",
    clearCookieOptions("/api/auth/github/callback"),
  );
  return response;
}

function stateMatches(expected: string | undefined, actual: string | null) {
  if (
    !expected ||
    !actual ||
    !/^[A-Za-z0-9_-]{40,60}$/.test(expected) ||
    expected.length !== actual.length
  ) {
    return false;
  }
  return timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

export async function GET(request: NextRequest) {
  const stateCookie = request.cookies.get(GITHUB_STATE_COOKIE_NAME)?.value;
  const isLink = request.cookies.get(GITHUB_LINK_COOKIE_NAME)?.value === "true";
  const state = request.nextUrl.searchParams.get("state");
  if (!stateMatches(stateCookie, state)) return finish("invalid_state");

  const githubError = request.nextUrl.searchParams.get("error");
  if (githubError) {
    return finish(githubError === "access_denied" ? "cancelled" : "failed");
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code || code.length > 256) return finish("failed");
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (isLink && !sessionToken) return finish("expired");

  try {
    const exchange = await fetch(
      `${backendApiUrl()}/auth/github/${isLink ? "link/exchange" : "exchange"}`,
      {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(isLink && sessionToken
          ? { Authorization: `Bearer ${sessionToken}` }
          : {}),
      },
      body: JSON.stringify({ code, state }),
      cache: "no-store",
      },
    );
    if (!exchange.ok) {
      return finish(
        exchange.status === 401
          ? isLink
            ? "expired"
            : "invalid_state"
          : exchange.status === 409
            ? "link_conflict"
            : "failed",
      );
    }

    const result = (await exchange.json()) as {
      linked?: unknown;
      accessToken?: unknown;
      user?: unknown;
    };
    if (result.linked === true) return finish("linked");
    if (
      typeof result.accessToken !== "string" ||
      !result.user ||
      typeof result.user !== "object"
    ) {
      return finish("failed");
    }

    const response = finish("success");
    response.cookies.set(
      SESSION_COOKIE_NAME,
      result.accessToken,
      secureCookieOptions(SESSION_MAX_AGE_SECONDS),
    );
    return response;
  } catch {
    return finish("failed");
  }
}
