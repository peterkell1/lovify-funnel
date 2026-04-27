"use client";

import { useState } from "react";
import { HiCheck } from "react-icons/hi2";
import { postAnswer } from "@/lib/client-api";
import { interpolate } from "@/lib/interpolate";
import { Cta } from "../Cta";
import type { StepProps } from "@/components/steps/types";

export function QuizMultiStep({
  step,
  sessionId,
  onNext,
  priorAnswers,
}: StepProps<"quiz-multi">) {
  const seeded =
    (priorAnswers[step.step_key] as { values?: string[] } | undefined)?.values ?? [];
  const [selected, setSelected] = useState<string[]>(seeded);
  const [busy, setBusy] = useState(false);
  const title = interpolate(step.config.title, priorAnswers);
  const subtitle = step.config.subtitle
    ? interpolate(step.config.subtitle, priorAnswers)
    : null;
  const min = step.config.min ?? 1;
  const max = step.config.max ?? Infinity;

  const toggle = (value: string) => {
    setSelected((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value);
      if (prev.length >= max) return prev;
      return [...prev, value];
    });
  };

  const canContinue = selected.length >= min && !busy;

  const submit = async () => {
    if (!canContinue) return;
    setBusy(true);
    if (sessionId) {
      await postAnswer({
        sessionId,
        stepId: step.id,
        stepKey: step.step_key,
        answer: { values: selected },
      }).catch(() => { setBusy(false); return; });
    }
    onNext();
  };

  return (
    <>
      <div className="text-center pt-4 md:pt-8">
        <h1 className="lt2-headline text-2xl md:text-[2rem] max-w-2xl mx-auto leading-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 text-[var(--lt2-muted)] text-sm md:text-base max-w-xl mx-auto">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="lt2-stagger flex-1 pt-6 md:pt-8 grid grid-cols-1 gap-2.5 w-full">
        {(step.config.options ?? []).map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              data-selected={isSelected}
              onClick={() => toggle(opt.value)}
              className="lt2-row w-full px-4 py-[14px] flex items-center justify-between gap-3 text-left"
            >
              <span className="flex items-center gap-3 min-w-0">
                {opt.emoji ? (
                  <span className="text-xl flex-shrink-0 w-7 inline-flex items-center justify-center">
                    {opt.emoji}
                  </span>
                ) : null}
                <span className="font-medium text-base text-[var(--lt2-fg)]">
                  {opt.label}
                </span>
              </span>
              <span className="lt2-check" data-checked={isSelected}>
                {isSelected ? <HiCheck className="h-3.5 w-3.5" /> : null}
              </span>
            </button>
          );
        })}
      </div>
      <Cta onClick={submit} disabled={!canContinue}>
        {step.config.cta_label ?? "Next step"}
      </Cta>
    </>
  );
}
