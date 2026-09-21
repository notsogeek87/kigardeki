import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// Deliberately built from the Edge-safe authConfig only — see
// src/lib/auth.config.ts for why this must never import src/lib/auth.ts.
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/login", "/register"];

/**
 * A per-request nonce lets script-src stay strict ('nonce-<value>' plus
 * 'strict-dynamic') instead of falling back to 'unsafe-inline', which would
 * let any injected <script> run — exactly the vector that would exfiltrate
 * the family/children data this app exists to protect, if an XSS ever
 * slipped through. Next.js reads this nonce back off the request headers to
 * sign the scripts it injects itself, so no per-component wiring is needed
 * (see the `headers()` call in src/app/layout.tsx).
 */
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/share/") ||
    pathname.startsWith("/api/auth");

  let response: NextResponse;

  if (!req.auth && !isPublic) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    response = NextResponse.redirect(loginUrl);
  } else if (req.auth && (pathname === "/login" || pathname === "/register")) {
    response = NextResponse.redirect(new URL("/today", req.nextUrl.origin));
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  response.headers.set("Content-Security-Policy", csp);
  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|manifest.webmanifest|sw.js|icons).*)"],
};
