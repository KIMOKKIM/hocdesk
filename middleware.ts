import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/Jinwoong", request.url));
  }

  if (pathname === "/targetbridge" || pathname.startsWith("/targetbridge/")) {
    const suffix = pathname.slice("/targetbridge".length) || "";
    return NextResponse.redirect(new URL(`/Jinwoong${suffix}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/targetbridge", "/targetbridge/:path*"],
};
