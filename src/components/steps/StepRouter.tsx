"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import type { FunnelRow, FunnelStep, StepType } from "@/lib/funnel-types";
import type { PriorAnswers } from "@/lib/interpolate";
import { getTemplate } from "@/templates/registry";
import type { StepProps } from "./types";

const HIDE_PROGRESS_ON: ReadonlyArray<StepType> = [
  "crafting",
  "paywall",
  "success",
];

export function StepRouter({
  funnel,
  step,
  sessionId: initialSessionId,
  stepIndex,
  totalSteps,
  nextStepKey,
  priorAnswers,
  needsAnonymousMint,
}: {
  funnel: FunnelRow;
  step: FunnelStep;
  sessionId: string | null;
  stepIndex: number;
  totalSteps: number;
  nextStepKey: string | null;
  priorAnswers: PriorAnswers;
  needsAnonymousMint?: boolean;
}) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const minted = useRef(false);

  useEffect(() => {
    if (!needsAnonymousMint || minted.current) return;
    minted.current = true;
    fetch("/api/sessions/anonymous", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ funnelId: funnel.id, stepKey: step.step_key }),
    })
      .then((r) => r.json())
      .then((data) => { if (data.sessionId) setSessionId(data.sessionId); })
      .catch(() => {});
  }, [needsAnonymousMint, funnel.id, step.step_key]);

  const onNext = useCallback(() => {
    if (nextStepKey) {
      router.push(`/${funnel.slug}/${nextStepKey}`);
    } else {
      router.push(`/${funnel.slug}/success`);
    }
  }, [funnel.slug, nextStepKey, router]);

  const template = getTemplate(funnel.template);
  const Step = template.steps[step.step_type] as
    | ComponentType<StepProps<StepType>>
    | undefined;
  const hideProgress = HIDE_PROGRESS_ON.includes(step.step_type);

  return (
    <template.Layout
      funnel={funnel}
      step={step}
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      hideProgress={hideProgress}
    >
      {Step ? (
        <Step
          funnel={funnel}
          step={step}
          sessionId={sessionId}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          onNext={onNext}
          priorAnswers={priorAnswers}
        />
      ) : null}
    </template.Layout>
  );
}
