import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { sha256Hex } from "@/lib/sha256";
import { supabaseServiceRole } from "@/lib/supabase-server";

export const runtime = "nodejs";

const bodySchema = z.object({
  sessionId: z.string().uuid().optional(),
  event: z.enum([
    "ViewContent",
    "Lead",
    "InitiateCheckout",
    "AddPaymentInfo",
    "Purchase",
    "CompleteRegistration",
  ]),
  eventId: z.string().optional(),
  email: z.string().email().optional(),
  value: z.number().optional(),
  currency: z.string().optional(),
  fbp: z.string().optional(),
  fbc: z.string().optional(),
});

export async function POST(req: Request) {
  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!env.metaPixelId || !env.metaCapiToken) {
    return NextResponse.json({ skipped: "capi_not_configured" });
  }

  // If a sessionId is provided, inherit email + landing_event_id from the DB
  // so the browser caller doesn't have to pass them (and so the event_id
  // lines up with the server-side Purchase event the webhook fires).
  const sb = supabaseServiceRole();
  let email = payload.email;
  let eventId = payload.eventId;
  if (payload.sessionId && (!email || !eventId)) {
    const { data } = await sb
      .from("funnel_sessions")
      .select("email, landing_event_id")
      .eq("id", payload.sessionId)
      .maybeSingle();
    if (data) {
      email = email ?? ((data as { email: string | null }).email ?? undefined);
      eventId = eventId ?? ((data as { landing_event_id: string }).landing_event_id);
    }
  }

  const ipHeader =
    req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "";
  const clientIp = ipHeader.split(",")[0]?.trim();

  const userData: Record<string, unknown> = {
    client_user_agent: req.headers.get("user-agent") ?? undefined,
    client_ip_address: clientIp || undefined,
    fbp: payload.fbp,
    fbc: payload.fbc,
  };
  if (email) userData.em = [sha256Hex(email)];

  const capiBody = {
    data: [
      {
        event_name: payload.event,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        user_data: userData,
        custom_data:
          payload.value !== undefined
            ? { value: payload.value, currency: payload.currency ?? "USD" }
            : undefined,
      },
    ],
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${env.metaPixelId}/events?access_token=${env.metaCapiToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(capiBody),
      },
    );
    const out = await res.json().catch(() => ({}));

    // Audit log. Best-effort — never block the caller.
    if (payload.sessionId && eventId) {
      await sb
        .from("attribution_events")
        .insert({
          session_id: payload.sessionId,
          event_name: payload.event,
          event_id: eventId,
          platform: "meta",
          payload: capiBody,
          sent_at: new Date().toISOString(),
          status: res.ok ? "sent" : "error",
          response: out,
        })
        .then(() => {});
    }

    if (!res.ok) {
      return NextResponse.json({ error: "capi_error", out }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "capi_fetch_failed", message: e instanceof Error ? e.message : "" },
      { status: 500 },
    );
  }
}
