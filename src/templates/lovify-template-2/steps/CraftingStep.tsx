"use client";

import { useEffect, useState } from "react";
import { HiCheck } from "react-icons/hi2";
import { postAnswer } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import type { StepProps } from "@/components/steps/types";

// Loader interstitial. Larger ring, refined checklist, even spacing.
// Animates the ring up to 100% over `duration_ms`, ticking through the
// messages list, then auto-advances.
export function CraftingStep({ step, sessionId, onNext }: StepProps<"crafting">) {
  const messages = step.config.messages?.length
    ? step.config.messages
    : ["Analyzing your answers"];
  const duration = step.config.duration_ms ?? 5000;
  const [pct, setPct] = useState(0);
  const [doneIdx, setDoneIdx] = useState(-1);

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const next = Math.min(100, Math.round((elapsed / duration) * 100));
      setPct(next);
      const completed = Math.floor((next / 100) * messages.length);
      setDoneIdx(Math.min(messages.length - 1, completed - 1));
      if (next >= 100) return;
      raf = requestAnimationFrame(tick);
    };
    let raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, messages.length]);

  useEffect(() => {
    if (pct < 100) return;
    const t = setTimeout(async () => {
      if (sessionId) {
        await postAnswer({
          sessionId,
          stepId: step.id,
          stepKey: step.step_key,
          answer: { completed: true },
        }).catch(() => {});
      }
      onNext();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct]);

  // Ring metrics
  const r = 88;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full py-8 md:py-12">
      <div className="relative h-52 w-52 md:h-60 md:w-60 flex items-center justify-center">
        <svg viewBox="0 0 200 200" className="absolute inset-0 -rotate-90">
          <circle cx="100" cy="100" r={r} stroke="var(--lt2-border)" strokeWidth="8" fill="none" />
          <circle
            cx="100"
            cy="100"
            r={r}
            stroke="var(--lt2-fg)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            fill="none"
            style={{ transition: "stroke-dashoffset 80ms linear" }}
          />
        </svg>
        <div className="lt2-headline text-4xl md:text-5xl tabular-nums">
          {pct}
          <span className="text-lg md:text-xl align-top ml-1 font-semibold">%</span>
        </div>
      </div>

      <h2 className="mt-8 lt2-headline text-2xl md:text-3xl text-center">
        {step.config.title}
      </h2>

      <ul className="mt-7 w-full flex flex-col gap-3 border-t border-[var(--lt2-border)] pt-6">
        {messages.map((m, i) => {
          const done = i <= doneIdx;
          const active = i === doneIdx + 1;
          return (
            <li
              key={i}
              className={cn(
                "flex items-center gap-3 text-sm md:text-base transition-colors",
                done ? "text-[var(--lt2-fg)] font-semibold" : "text-[var(--lt2-muted)]",
              )}
            >
              <span
                className={cn(
                  "h-6 w-6 inline-flex items-center justify-center flex-shrink-0 rounded-full transition-colors",
                  done
                    ? "bg-[var(--lt2-fg)] text-white"
                    : active
                      ? "border border-[var(--lt2-fg)] text-[var(--lt2-fg)]"
                      : "border border-[var(--lt2-border)] text-[var(--lt2-muted)]",
                )}
              >
                {done ? (
                  <HiCheck className="h-3.5 w-3.5" />
                ) : active ? (
                  <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
                )}
              </span>
              <span>{m}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
