import { NextResponse } from "next/server";
import { z } from "zod";
import { bustFunnelCache } from "@/lib/funnel-config";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const bodySchema = z.object({
  slug: z.string().min(1),
});

// CORS: admin panel runs on a different origin (Vite dev server, or the
// prod admin host). Browsers preflight the POST with OPTIONS and require
// matching Access-Control-* headers back, or the actual POST is never
// sent. We echo the Origin header back only if it's in our allow-list so
// this endpoint isn't world-callable.
function buildCorsHeaders(origin: string | null): HeadersInit {
  const allowed = origin && env.funnelAdminOrigins.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-revalidate-secret",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(req.headers.get("origin")),
  });
}

export async function POST(req: Request) {
  const cors = buildCorsHeaders(req.headers.get("origin"));
  const secret = req.headers.get("x-revalidate-secret");
  if (!env.funnelRevalidateSecret || secret !== env.funnelRevalidateSecret) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: cors },
    );
  }
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: "invalid_body" },
      { status: 400, headers: cors },
    );
  }
  bustFunnelCache(body.slug);
  return NextResponse.json({ ok: true, slug: body.slug }, { headers: cors });
}
