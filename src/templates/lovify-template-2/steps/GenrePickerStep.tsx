"use client";

import { useState } from "react";
import { postAnswer } from "@/lib/client-api";
import { Cta } from "../Cta";
import type { StepProps } from "@/components/steps/types";

export function GenrePickerStep({
  step,
  sessionId,
  onNext,
}: StepProps<"genre-picker">) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (v: string) => {
    setSelected((curr) => {
      if (curr.includes(v)) return curr.filter((x) => x !== v);
      if (curr.length >= step.config.max) return curr;
      return [...curr, v];
    });
  };

  const canContinue = selected.length >= step.config.min && !busy;

  const handleContinue = async () => {
    if (!canContinue) return;
    setBusy(true);
    setErr(null);
    try {
      if (sessionId) {
        await postAnswer({
          sessionId,
          stepId: step.id,
          stepKey: step.step_key,
          answer: { values: selected },
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
      <div className="text-center pt-4 md:pt-8">
        <h1 className="lt2-headline text-2xl md:text-[2rem] max-w-2xl mx-auto leading-tight">
          {step.config.title}
        </h1>
        {step.config.subtitle ? (
          <p className="mt-3 text-[var(--lt2-muted)] text-sm md:text-base">
            {step.config.subtitle}
          </p>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar py-6">
        <div className="flex flex-wrap justify-center gap-2.5">
          {step.config.genres.map((g) => {
            const isSelected = selected.includes(g.value);
            return (
              <button
                key={g.value}
                type="button"
                onClick={() => toggle(g.value)}
                className={
                  "px-4 py-2.5 rounded-full border-2 flex items-center gap-2 text-sm font-semibold transition-colors " +
                  (isSelected
                    ? "border-[var(--lt2-fg)] bg-[var(--lt2-card-soft)] text-[var(--lt2-fg)]"
                    : "border-[var(--lt2-border)] bg-[var(--lt2-card)] text-[var(--lt2-fg)] hover:border-[var(--lt2-fg)]")
                }
              >
                {g.emoji ? <span className="text-base">{g.emoji}</span> : null}
                <span>{g.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-sm text-[var(--lt2-muted)] text-center">
        {selected.length === 0
          ? `Select at least ${step.config.min} to continue`
          : `${selected.length} selected`}
      </p>

      {err ? (
        <p className="mt-2 text-sm text-rose-600 text-center">{err}</p>
      ) : null}

      <Cta onClick={handleContinue} disabled={!canContinue}>
        {busy ? "Saving…" : step.config.cta_label ?? "Continue"}
      </Cta>
    </>
  );
}
