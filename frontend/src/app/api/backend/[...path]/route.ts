import { NextRequest, NextResponse } from "next/server";
import {
  clearCookieOptions,
  hasExpectedOrigin,
  SESSION_COOKIE_NAME,
  secureCookieOptions,
  SESSION_MAX_AGE_SECONDS,
  backendApiUrl,
} from "@/lib/auth-cookies";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyRequest(request: NextRequest, context: RouteContext) {
  const method = request.method.toUpperCase();
  const { path } = await context.params;
  const endpoint = path.join("/");
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(method);

  if (isMutation && !hasExpectedOrigin(request)) {
    return NextResponse.json(
      { message: "The request origin is not allowed." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const apiUrl = new URL(
    `${backendApiUrl()}/${path.map(encodeURIComponent).join("/")}`,
  );
  apiUrl.search = new URL(request.url).search;

  const headers = new Headers();
  for (const name of ["accept", "content-type"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionToken) {
    headers.set("Authorization", `Bearer ${sessionToken}`);
  }

  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await request.arrayBuffer();
  const isLogout = endpoint === "auth/logout" && method === "POST";

  try {
    const upstream = await fetch(apiUrl, {
      method,
      headers,
      body,
      cache: "no-store",
      signal: request.signal,
    });

    if (
      endpoint === "auth/login" &&
      method === "POST" &&
      upstream.ok
    ) {
      const login = (await upstream.json()) as {
        accessToken?: unknown;
        user?: unknown;
      };
      if (
        typeof login.accessToken !== "string" ||
        !login.user ||
        typeof login.user !== "object"
      ) {
        return NextResponse.json(
          { message: "The sign-in response from the API was invalid." },
          { status: 502, headers: { "Cache-Control": "no-store" } },
        );
      }
      const response = NextResponse.json(
        { user: login.user },
        { headers: { "Cache-Control": "no-store" } },
      );
      response.cookies.set(
        SESSION_COOKIE_NAME,
        login.accessToken,
        secureCookieOptions(SESSION_MAX_AGE_SECONDS),
      );
      return response;
    }

    const responseBody = [204, 205, 304].includes(upstream.status)
      ? null
      : upstream.body;
    const response = new NextResponse(responseBody, {
      status: upstream.status,
      headers: {
        "Cache-Control": "no-store",
        ...(upstream.headers.get("content-type")
          ? { "Content-Type": upstream.headers.get("content-type")! }
          : {}),
      },
    });
    if (upstream.status === 401 && sessionToken) {
      response.cookies.set(
        SESSION_COOKIE_NAME,
        "",
        clearCookieOptions(),
      );
    }
    if (isLogout) {
      response.cookies.set(
        SESSION_COOKIE_NAME,
        "",
        clearCookieOptions(),
      );
    }
    return response;
  } catch {
    const response = NextResponse.json(
      { message: "The backend API could not be reached. Please try again." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
    if (isLogout) {
      response.cookies.set(
        SESSION_COOKIE_NAME,
        "",
        clearCookieOptions(),
      );
    }
    return response;
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
