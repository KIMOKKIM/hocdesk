import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  parseCookieValue,
  verifyAdminSessionToken,
} from "@/lib/auth/session-token";
import { BASE_PATH } from "@/lib/config";

function getRawPathname(request: NextRequest): string {
  const pathname = new URL(request.url).pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function stripBasePath(pathname: string): string {
  if (pathname === BASE_PATH) return "/";
  if (pathname.startsWith(`${BASE_PATH}/`)) {
    return pathname.slice(BASE_PATH.length) || "/";
  }
  return pathname;
}

function redirectIfDifferent(request: NextRequest, destinationPath: string) {
  const current = getRawPathname(request);
  const destination = new URL(destinationPath, request.url);
  const target =
    destination.pathname.endsWith("/") && destination.pathname.length > 1
      ? destination.pathname.slice(0, -1)
      : destination.pathname;

  if (current === target) {
    return NextResponse.next();
  }

  return NextResponse.redirect(destination);
}

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/projects",
  "/targets",
  "/search-candidates",
  "/verification-queue",
  "/activities",
  "/expansion-suggestions",
  "/outreach",
  "/activity-log",
  "/settings",
  "/collection-jobs",
  "/proposals",
];

const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/health",
];

function isPublicPath(appPath: string): boolean {
  if (appPath === "/login") return true;
  if (PUBLIC_API_PREFIXES.some((p) => appPath === p || appPath.startsWith(`${p}/`))) {
    return true;
  }
  if (appPath.startsWith("/_next")) return true;
  if (appPath === "/favicon.ico") return true;
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff2?)$/i.test(appPath)) {
    return true;
  }
  return false;
}

function isProtectedPath(appPath: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => appPath === prefix || appPath.startsWith(`${prefix}/`),
  );
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = parseCookieValue(request.headers.get("cookie"), ADMIN_COOKIE_NAME);
  const payload = await verifyAdminSessionToken(token);
  return payload !== null;
}

function isAdminProtectionRequired(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return Boolean(
      process.env.ADMIN_USERNAME?.trim() && process.env.ADMIN_PASSWORD,
    );
  }
  return true;
}

export async function middleware(request: NextRequest) {
  const pathname = getRawPathname(request);

  // Domain root only — avoid /Jinwoong ↔ / loop
  if (pathname === "/") {
    return redirectIfDifferent(request, BASE_PATH);
  }

  if (pathname === "/targetbridge" || pathname.startsWith("/targetbridge/")) {
    const suffix = pathname.slice("/targetbridge".length) || "";
    return redirectIfDifferent(request, `${BASE_PATH}${suffix}`);
  }

  const appPath = stripBasePath(pathname);

  if (!isAdminProtectionRequired()) {
    return NextResponse.next();
  }

  const authenticated = await hasValidSession(request);

  if (appPath === "/login" && authenticated) {
    return NextResponse.redirect(new URL(`${BASE_PATH}/dashboard`, request.url));
  }

  if (isProtectedPath(appPath) && !authenticated) {
    return NextResponse.redirect(new URL(`${BASE_PATH}/login`, request.url));
  }

  if (
    appPath.startsWith("/api/") &&
    !isPublicPath(appPath) &&
    request.method !== "GET" &&
    !authenticated
  ) {
    // Write APIs still enforce requireAdmin; middleware only redirects pages.
    // Leave API 401 to route handlers.
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/targetbridge",
    "/targetbridge/:path*",
    "/login",
    "/dashboard",
    "/dashboard/:path*",
    "/projects",
    "/projects/:path*",
    "/targets",
    "/targets/:path*",
    "/search-candidates",
    "/search-candidates/:path*",
    "/verification-queue",
    "/verification-queue/:path*",
    "/activities",
    "/activities/:path*",
    "/expansion-suggestions",
    "/expansion-suggestions/:path*",
    "/outreach",
    "/outreach/:path*",
    "/activity-log",
    "/activity-log/:path*",
    "/settings",
    "/settings/:path*",
    "/collection-jobs",
    "/collection-jobs/:path*",
    "/proposals",
    "/proposals/:path*",
  ],
};
