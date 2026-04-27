import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { supabaseServiceRole } from "@/lib/supabase-server";
import { readAttribution, SESSION_COOKIE } from "@/lib/attribution";

export const runtime = "nodejs";

const bodySchema = z.object({
  funnelId: z.string().uuid(),
  stepKey: z.string().min(1),
});

export async function POST(req: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // If the client already has a valid session cookie for this funnel, skip.
  const existing = cookies().get(SESSION_COOKIE)?.value ?? null;
  if (existing) {
    const sb = supabaseServiceRole();
    const { data: sessRow } = await sb
      .from("funnel_sessions")
      .select("id, funnel_id")
      .eq("id", existing)
      .maybeSingle();
    if (sessRow && (sessRow as { funnel_id: string }).funnel_id === body.funnelId) {
      return NextResponse.json({ sessionId: existing });
    }
  }

  const sb = supabaseServiceRole();
  const attribution = (await readAttribution()) ?? {};
  const h = headers();
  const userAgent = h.get("user-agent");
  const forwardedFor = h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "";
  const clientIp = forwardedFor.split(",")[0]?.trim() || null;

  const { data: inserted, error } = await sb
    .from("funnel_sessions")
    .insert({
      funnel_id: body.funnelId,
      current_step_key: body.stepKey,
      attribution,
      user_agent: userAgent,
      ip_hash: clientIp,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: "mint_failed" }, { status: 500 });
  }

  const sessionId = (inserted as { id: string }).id;

  cookies().set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ sessionId });
}
