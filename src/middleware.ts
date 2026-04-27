import { NextResponse, type NextRequest } from "next/server";
import { signAttributionCookie, readAttributionCookie } from "@/lib/cookie-jwt";
import { ATTRIBUTION_COOKIE } from "@/lib/attribution";

const TRACKED_KEYS = [
  "ttclid",
  "fbclid",
  "gclid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const url = req.nextUrl;

  const incoming: Record<string, string> = {};
  for (const k of TRACKED_KEYS) {
    const v = url.searchParams.get(k);
    if (v) incoming[k] = v;
  }
  if (Object.keys(incoming).length === 0) return res;

  // Only set on first touch — don't overwrite an existing signed cookie,
  // so last-click attribution stays with the first ad that brought them in
  // within the 30-day window.
  const existing = await readAttributionCookie(
    req.cookies.get(ATTRIBUTION_COOKIE)?.value,
  );
  if (existing) return res;

  const token = await signAttributionCookie({
    ...incoming,
    firstSeenAt: Date.now(),
  });
  res.cookies.set(ATTRIBUTION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
  return res;
}

export const config = {
  matcher: [
    // Run on every path except Next internals, API routes that don't need it,
    // and static assets.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|api/revalidate|api/meta-capi).*)",
  ],
};
