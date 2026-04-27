import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServiceRole } from "@/lib/supabase-server";

export const runtime = "nodejs";

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  stepId: z.string().uuid(),
  stepKey: z.string().min(1),
  answer: z.record(z.string(), z.unknown()),
});

export async function POST(req: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const sb = supabaseServiceRole();

  // Verify session + step belong together (prevents spoofing a stepId from
  // a different funnel).
  const { data: session, error: sessionErr } = await sb
    .from("funnel_sessions")
    .select("id, funnel_id, status")
    .eq("id", body.sessionId)
    .maybeSingle();
  if (sessionErr || !session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }
  if ((session as { status: string }).status !== "active") {
    return NextResponse.json({ error: "session_closed" }, { status: 410 });
  }

  const { data: step } = await sb
    .from("funnel_steps")
    .select("id, funnel_id, step_key")
    .eq("id", body.stepId)
    .maybeSingle();
  if (
    !step ||
    (step as { funnel_id: string }).funnel_id !==
      (session as { funnel_id: string }).funnel_id ||
    (step as { step_key: string }).step_key !== body.stepKey
  ) {
    return NextResponse.json({ error: "step_mismatch" }, { status: 400 });
  }

  const { error: upsertErr } = await sb.from("funnel_answers").upsert(
    {
      session_id: body.sessionId,
      step_id: body.stepId,
      step_key: body.stepKey,
      answer: body.answer,
    },
    { onConflict: "session_id,step_id" },
  );
  if (upsertErr) {
    return NextResponse.json({ error: "answer_write_failed" }, { status: 500 });
  }

  // Advance current_step_key to the next step in position order.
  const { data: nextSteps } = await sb
    .from("funnel_steps")
    .select("step_key, position")
    .eq("funnel_id", (session as { funnel_id: string }).funnel_id)
    .order("position");
  const all = (nextSteps ?? []) as { step_key: string; position: number }[];
  const currIdx = all.findIndex((s) => s.step_key === body.stepKey);
  const nextKey = currIdx >= 0 && currIdx < all.length - 1 ? all[currIdx + 1].step_key : null;
  if (nextKey) {
    await sb
      .from("funnel_sessions")
      .update({ current_step_key: nextKey })
      .eq("id", body.sessionId);
  }

  return NextResponse.json({ ok: true, nextStepKey: nextKey });
}
