import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { BASE_PATH } from "@/lib/config";

function getRawPathname(request: NextRequest): string {
  const pathname = new URL(request.url).pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function redirectIfDifferent(request: NextRequest, destinationPath: string) {
  const current = getRawPathname(request);
  const destination = new URL(destinationPath, request.url);
  const target = destination.pathname.endsWith("/") && destination.pathname.length > 1
    ? destination.pathname.slice(0, -1)
    : destination.pathname;

  if (current === target) {
    return NextResponse.next();
  }

  return NextResponse.redirect(destination);
}

export function middleware(request: NextRequest) {
  const pathname = getRawPathname(request);

  // Domain root only. With basePath="/Jinwoong", /Jinwoong has raw pathname "/Jinwoong"
  // (middleware pathname is "/") — redirecting "/" -> "/Jinwoong" there causes a loop.
  if (pathname === "/") {
    return redirectIfDifferent(request, BASE_PATH);
  }

  if (pathname === "/targetbridge" || pathname.startsWith("/targetbridge/")) {
    const suffix = pathname.slice("/targetbridge".length) || "";
    return redirectIfDifferent(request, `${BASE_PATH}${suffix}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/targetbridge", "/targetbridge/:path*"],
};
