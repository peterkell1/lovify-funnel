import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { loadFunnel, findStepByKey, getNextStepKey } from "@/lib/funnel-config";
import { SESSION_COOKIE } from "@/lib/attribution";
import { loadPriorAnswers } from "@/lib/load-answers";
import { StepRouter } from "@/components/steps/StepRouter";
import { MetaPixelEvent } from "@/components/analytics/MetaPixelEvent";
import { supabaseServiceRole } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string; step: string } };

export default async function StepPage({ params }: Props) {
  const loaded = await loadFunnel(params.slug);
  if (!loaded) notFound();

  const step = findStepByKey(loaded, params.step);
  if (!step) notFound();

  // Success step has its own dedicated route — guide users there if they
  // somehow land here via an old link.
  if (step.step_type === "success") notFound();

  const stepIndex = loaded.steps.findIndex((s) => s.step_key === step.step_key);
  const nextStepKey = getNextStepKey(loaded, step.step_key);
  const funnelId = loaded.funnel.id;
  const sb = supabaseServiceRole();

  // Validate the session cookie belongs to THIS funnel. A stale cookie
  // from a different funnel would otherwise pass the sessionId down to
  // the client, which then POSTs stepIds from this funnel against a
  // session on another — the answers API rejects that as step_mismatch
  // and the user sees a broken CTA. Drop the mismatched cookie.
  const rawSessionId = cookies().get(SESSION_COOKIE)?.value ?? null;
  let sessionId: string | null = null;
  if (rawSessionId) {
    const { data: sessRow } = await sb
      .from("funnel_sessions")
      .select("id, funnel_id, status")
      .eq("id", rawSessionId)
      .maybeSingle();
    if (sessRow && (sessRow as { funnel_id: string }).funnel_id === funnelId) {
      // If this session already converted, never let the user back into a
      // mid-funnel step (paywall, narrative, etc.) — every postAnswer
      // would 410 with session_closed and the UX is broken. Bounce them
      // straight to the success page.
      if ((sessRow as { status: string }).status === "converted") {
        redirect(`/${params.slug}/success`);
      }
      sessionId = rawSessionId;
    }
  }

  // If there's no session on the first step, the client will call
  // POST /api/sessions/anonymous to mint one and set the cookie.
  const isFirstStep = stepIndex === 0;
  const needsAnonymousMint = !sessionId && isFirstStep;

  const priorAnswers = await loadPriorAnswers(sessionId);

  return (
    <>
      <MetaPixelEvent
        event="ViewContent"
        params={{ content_name: `${params.slug}:${step.step_key}` }}
      />
      <StepRouter
        funnel={loaded.funnel}
        step={step}
        sessionId={sessionId}
        stepIndex={stepIndex}
        totalSteps={loaded.steps.length}
        nextStepKey={nextStepKey}
        priorAnswers={priorAnswers}
        needsAnonymousMint={needsAnonymousMint}
      />
    </>
  );
}
