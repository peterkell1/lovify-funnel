"use client";

import { useState } from "react";
import { HiCheck, HiXMark } from "react-icons/hi2";
import { postAnswer } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import type { StepProps } from "@/components/steps/types";

// Statement step in lovify-template-2 styling. Same data contract as
// the v1 statement: yes/no by default, Likert 1..max when config.scale
// is set. Auto-advances on pick (no separate CTA).
export function StatementStep({
  step,
  sessionId,
  onNext,
}: StepProps<"statement">) {
  const isLikert = !!step.config.scale && step.config.scale.max >= 2;
  const [pending, setPending] = useState<string | number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (value: number | "yes" | "no") => {
    if (pending !== null) return;
    setPending(value);
    setErr(null);
    try {
      if (sessionId) {
        await postAnswer({
          sessionId,
          stepId: step.id,
          stepKey: step.step_key,
          answer:
            typeof value === "number"
              ? { value }
              : { value, relates: value === "yes" },
        });
      }
      setTimeout(() => onNext(), 250);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setPending(null);
    }
  };

  return (
    <>
      <div className="text-center pt-4 md:pt-10">
        <h1 className="lt2-headline text-2xl md:text-4xl max-w-2xl mx-auto">
          {step.config.title}
        </h1>
        {step.config.statement ? (
          <p className="mt-4 text-[var(--lt2-muted)] text-base md:text-lg max-w-xl mx-auto">
            {step.config.statement}
          </p>
        ) : null}
      </div>
      <div className="flex-1 flex items-center justify-center py-10">
        {isLikert ? (
          <div className="w-full max-w-lg">
            <div className="flex items-center justify-center gap-2 md:gap-3">
              {Array.from({ length: step.config.scale!.max }, (_, i) => i + 1).map((v) => {
                const isSelected = pending === v;
                return (
                  <button
                    key={v}
                    type="button"
                    disabled={pending !== null}
                    onClick={() => submit(v)}
                    className={cn(
                      "h-14 w-14 md:h-16 md:w-16 rounded-2xl border lt2-headline text-xl md:text-2xl flex items-center justify-center transition",
                      isSelected
                        ? "bg-[var(--lt2-cta-bg)] text-[var(--lt2-cta-fg)] border-[var(--lt2-cta-bg)]"
                        : "bg-[var(--lt2-bg)] border-[var(--lt2-border)] hover:border-[var(--lt2-fg)]",
                    )}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex justify-between text-xs md:text-sm text-[var(--lt2-muted)] px-1">
              <span>{step.config.scale!.min_label ?? ""}</span>
              <span>{step.config.scale!.max_label ?? ""}</span>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 w-full max-w-md">
            {(["no", "yes"] as const).map((v) => {
              const isSelected = pending === v;
              const Icon = v === "yes" ? HiCheck : HiXMark;
              return (
                <button
                  key={v}
                  type="button"
                  disabled={pending !== null}
                  onClick={() => submit(v)}
                  className={cn(
                    "flex-1 py-5 rounded-2xl border lt2-headline text-base capitalize flex items-center justify-center gap-2 transition",
                    isSelected
                      ? "bg-[var(--lt2-cta-bg)] text-[var(--lt2-cta-fg)] border-[var(--lt2-cta-bg)]"
                      : "bg-[var(--lt2-bg)] border-[var(--lt2-border)] hover:border-[var(--lt2-fg)]",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {v}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {err ? <p className="pb-4 text-sm text-rose-600 text-center">{err}</p> : null}
    </>
  );
}
