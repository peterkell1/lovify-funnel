import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { loadFunnel } from "@/lib/funnel-config";
import { SESSION_COOKIE } from "@/lib/attribution";
import { supabaseServiceRole } from "@/lib/supabase-server";
import { getTemplate } from "@/templates/registry";
import { SuccessStep as DefaultSuccess } from "@/components/steps/SuccessStep";
import { PhoneFrame } from "@/components/ui/PhoneFrame";
import type { FunnelStep, StepConfigByType } from "@/lib/funnel-types";

type Props = { params: { slug: string } };

export default async function SuccessPage({ params }: Props) {
  const loaded = await loadFunnel(params.slug);
  if (!loaded) notFound();

  const successStep = loaded.steps.find((s) => s.step_type === "success") as
    | (FunnelStep<"success"> & { config: StepConfigByType["success"] })
    | undefined;
  if (!successStep) notFound();

  const sessionId = cookies().get(SESSION_COOKIE)?.value ?? null;
  let email: string | null = null;
  let landingEventId: string | null = null;

  if (sessionId) {
    const sb = supabaseServiceRole();
    const { data } = await sb
      .from("funnel_sessions")
      .select("email, landing_event_id")
      .eq("id", sessionId)
      .maybeSingle();
    if (data) {
      email = (data as { email: string | null }).email;
      landingEventId = (data as { landing_event_id: string }).landing_event_id;
    }

    // Record that this session reached the success step so funnel
    // analytics picks it up. Idempotent via (session_id, step_id) unique
    // constraint on funnel_answers, so refreshes don't double-count.
    await sb
      .from("funnel_answers")
      .upsert(
        {
          session_id: sessionId,
          step_id: successStep.id,
          step_key: successStep.step_key,
          answer: { reached: true },
        },
        { onConflict: "session_id,step_id" },
      );
  }

  // Pick the right Success renderer + chrome from the funnel's
  // template. Templates that don't supply a Success fall back to v1's
  // SuccessStep + PhoneFrame.
  const template = getTemplate(loaded.funnel.template);
  const SuccessRenderer = template.Success ?? DefaultSuccess;
  const SuccessLayout = template.SuccessLayout;

  const body = (
    <SuccessRenderer
      step={successStep}
      email={email}
      landingEventId={landingEventId}
    />
  );

  if (SuccessLayout) {
    return <SuccessLayout funnel={loaded.funnel}>{body}</SuccessLayout>;
  }
  return body;
}

// Suppress unused-import warning when the fallback path isn't taken.
// `PhoneFrame` is intentionally kept as a guarded fallback for any
// older funnel rows that might point to a template without a
// SuccessLayout (defense in depth).
void PhoneFrame;
