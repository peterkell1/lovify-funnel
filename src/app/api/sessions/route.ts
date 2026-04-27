import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { supabaseServiceRole } from "@/lib/supabase-server";
import { readAttribution, SESSION_COOKIE } from "@/lib/attribution";
import { loadFunnel, getNextStepKey } from "@/lib/funnel-config";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.trim().toLowerCase();
  const funnelId = searchParams.get("funnelId");

  if (!email || !funnelId) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  const sb = supabaseServiceRole();

  // Check 1: already converted via any funnel session
  const { data: convertedSession } = await sb
    .from("funnel_sessions")
    .select("id")
    .eq("funnel_id", funnelId)
    .eq("email", email)
    .eq("status", "converted")
    .limit(1)
    .maybeSingle();

  if (convertedSession) {
    return NextResponse.json({ taken: true });
  }

  // Check 2: registered user with an active/paying subscription in the app
  const { data: profile } = await sb
    .from("profiles")
    .select("id")
    .eq("email", email)
    .in("subscription_status", ["active", "past_due", "grace_period"])
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ taken: !!profile });
}

const bodySchema = z.object({
  funnelId: z.string().uuid(),
  stepKey: z.string().min(1),
  email: z.string().email(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const sb = supabaseServiceRole();

  // Verify the funnel is live and look up its slug — the session can
  // lie about funnelId; trust only what's actually in the DB.
  const { data: funnelRow, error: funnelErr } = await sb
    .from("funnels")
    .select("id, slug, status")
    .eq("id", body.funnelId)
    .maybeSingle();
  if (funnelErr || !funnelRow) {
    return NextResponse.json({ error: "funnel_not_found" }, { status: 404 });
  }
  if ((funnelRow as { status: string }).status !== "live") {
    return NextResponse.json({ error: "funnel_not_live" }, { status: 403 });
  }

  const normalizedEmail = body.email.trim().toLowerCase();

  // Block emails that already have a converted funnel session or an active app subscription.
  const [{ data: convertedSession }, { data: activeProfile }] = await Promise.all([
    sb
      .from("funnel_sessions")
      .select("id")
      .eq("funnel_id", body.funnelId)
      .eq("email", normalizedEmail)
      .eq("status", "converted")
      .limit(1)
      .maybeSingle(),
    sb
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .in("subscription_status", ["active", "past_due", "grace_period"])
      .limit(1)
      .maybeSingle(),
  ]);

  if (convertedSession || activeProfile) {
    return NextResponse.json({ error: "email_already_used" }, { status: 409 });
  }

  const attribution = (await readAttribution()) ?? {};
  const h = headers();
  const userAgent = h.get("user-agent");
  const forwardedFor = h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "";
  const clientIp = forwardedFor.split(",")[0]?.trim() || null;

  // Prefer attaching the email to the existing anonymous session cookie
  // (auto-minted on first step load) so answers recorded before the
  // email step are kept under the same session row.
  const cookieSessionId = cookies().get(SESSION_COOKIE)?.value ?? null;
  let sessionId: string;

  if (cookieSessionId) {
    const { data: anonSession } = await sb
      .from("funnel_sessions")
      .select("id")
      .eq("id", cookieSessionId)
      .eq("funnel_id", body.funnelId)
      .eq("status", "active")
      .is("email", null)
      .maybeSingle();

    if (anonSession) {
      // Attach email to the anonymous session
      sessionId = (anonSession as { id: string }).id;
      await sb
        .from("funnel_sessions")
        .update({
          email: normalizedEmail,
          current_step_key: body.stepKey,
          user_agent: userAgent,
        })
        .eq("id", sessionId);
    } else {
      // Cookie session already has an email or belongs to another funnel —
      // fall back to resume-by-email or create fresh.
      const { data: existing } = await sb
        .from("funnel_sessions")
        .select("id")
        .eq("funnel_id", body.funnelId)
        .eq("email", normalizedEmail)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        sessionId = (existing as { id: string }).id;
        await sb
          .from("funnel_sessions")
          .update({ current_step_key: body.stepKey, user_agent: userAgent })
          .eq("id", sessionId);
      } else {
        const { data: inserted, error: insertErr } = await sb
          .from("funnel_sessions")
          .insert({
            funnel_id: body.funnelId,
            email: normalizedEmail,
            current_step_key: body.stepKey,
            attribution,
            user_agent: userAgent,
            ip_hash: clientIp,
          })
          .select("id")
          .single();
        if (insertErr || !inserted) {
          return NextResponse.json({ error: "session_create_failed" }, { status: 500 });
        }
        sessionId = (inserted as { id: string }).id;
      }
    }
  } else {
    // No cookie at all — resume by email or create fresh.
    const { data: existing } = await sb
      .from("funnel_sessions")
      .select("id")
      .eq("funnel_id", body.funnelId)
      .eq("email", normalizedEmail)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      sessionId = (existing as { id: string }).id;
      await sb
        .from("funnel_sessions")
        .update({ current_step_key: body.stepKey, user_agent: userAgent })
        .eq("id", sessionId);
    } else {
      const { data: inserted, error: insertErr } = await sb
        .from("funnel_sessions")
        .insert({
          funnel_id: body.funnelId,
          email: normalizedEmail,
          current_step_key: body.stepKey,
          attribution,
          user_agent: userAgent,
          ip_hash: clientIp,
        })
        .select("id")
        .single();
      if (insertErr || !inserted) {
        return NextResponse.json({ error: "session_create_failed" }, { status: 500 });
      }
      sessionId = (inserted as { id: string }).id;
    }
  }

  // Write the first funnel_answer for the email-capture step.
  const loaded = await loadFunnel((funnelRow as { slug: string }).slug);
  if (loaded) {
    const step = loaded.steps.find((s) => s.step_key === body.stepKey);
    if (step) {
      await sb.from("funnel_answers").upsert(
        {
          session_id: sessionId,
          step_id: step.id,
          step_key: step.step_key,
          answer: { email: body.email.trim().toLowerCase() },
        },
        { onConflict: "session_id,step_id" },
      );
      const next = getNextStepKey(loaded, step.step_key);
      if (next) {
        await sb
          .from("funnel_sessions")
          .update({ current_step_key: next })
          .eq("id", sessionId);
      }
    }
  }

  cookies().set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days — enough to resume within a session
  });

  return NextResponse.json({ sessionId });
}
