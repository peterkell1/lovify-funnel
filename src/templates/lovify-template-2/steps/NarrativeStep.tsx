"use client";

import { useState } from "react";
import { postAnswer } from "@/lib/client-api";
import { interpolate } from "@/lib/interpolate";
import { pickStepImage } from "@/lib/assets";
import { Cta } from "../Cta";
import type { StepProps } from "@/components/steps/types";

export function NarrativeStep({
  step,
  sessionId,
  onNext,
  priorAnswers,
}: StepProps<"narrative">) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const title = interpolate(step.config.title, priorAnswers);
  const subtitle = step.config.subtitle
    ? interpolate(step.config.subtitle, priorAnswers)
    : null;
  const imageUrl = pickStepImage(step.config);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      if (sessionId) {
        await postAnswer({
          sessionId,
          stepId: step.id,
          stepKey: step.step_key,
          answer: { acknowledged: true },
        });
      }
      onNext();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <>
      <div className="lt2-stagger flex-1 flex flex-col gap-6 pt-2 md:pt-8 max-w-2xl mx-auto w-full">
        {step.config.hero_emoji ? (
          <div className="text-3xl">{step.config.hero_emoji}</div>
        ) : null}
        <h1 className="lt2-headline text-2xl md:text-4xl">{title}</h1>
        {subtitle ? (
          <p className="text-[var(--lt2-muted)] text-base md:text-lg leading-relaxed">
            {subtitle}
          </p>
        ) : null}
        {imageUrl ? (
          <div className="flex-1 flex items-center justify-center min-h-0">
            <img
              src={imageUrl}
              alt=""
              className="object-contain w-auto max-w-full"
              style={{ maxHeight: 340 }}
            />
          </div>
        ) : null}
        {step.config.bullets && step.config.bullets.length > 0 ? (
          <div className="lt2-card p-5 md:p-6">
            <ul className="flex flex-col gap-3">
              {step.config.bullets.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 pb-3 border-b border-[var(--lt2-border)] last:border-0 last:pb-0"
                >
                  {b.emoji ? (
                    <span className="text-base mt-0.5">{b.emoji}</span>
                  ) : (
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--lt2-fg)] flex-shrink-0" />
                  )}
                  <span className="text-sm md:text-base leading-snug">{b.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      {err ? <p className="text-sm text-rose-600 text-center">{err}</p> : null}
      <Cta onClick={submit} disabled={busy}>
        {step.config.cta_label ?? "Continue"}
      </Cta>
    </>
  );
}
