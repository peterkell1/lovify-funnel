"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiChevronUp, HiChevronDown } from "react-icons/hi2";
import { postAnswer } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { Cta } from "../Cta";
import type { StepProps } from "@/components/steps/types";

// iOS-style number wheel, lovify-template-2 styling. Same data contract
// as the v1 component — `min/max/default/step/unit_label`. Renders a
// scrollable column of values + chevron buttons + keyboard arrows for
// desktop accessibility.
const ITEM_HEIGHT = 56;
const VISIBLE_ITEMS = 5;

export function NumberPickerStep({ step, sessionId, onNext, priorAnswers }: StepProps<"number-picker">) {
  const values = useMemo(() => {
    const out: number[] = [];
    for (let v = step.config.min; v <= step.config.max; v += step.config.step || 1) {
      out.push(v);
    }
    return out;
  }, [step.config.min, step.config.max, step.config.step]);

  const savedValue = (priorAnswers[step.step_key] as { value?: number } | undefined)?.value;
  const defaultIndex = Math.max(
    0,
    values.indexOf(savedValue ?? step.config.default ?? values[Math.floor(values.length / 2)]),
  );
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = defaultIndex * ITEM_HEIGHT;
  }, [defaultIndex]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / ITEM_HEIGHT);
    setSelectedIndex(Math.max(0, Math.min(values.length - 1, idx)));
  }, [values.length]);

  const goTo = useCallback(
    (idx: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(values.length - 1, idx));
      el.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: "smooth" });
    },
    [values.length],
  );

  const selectedValue = values[selectedIndex];

  const handleContinue = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      if (sessionId) {
        await postAnswer({
          sessionId,
          stepId: step.id,
          stepKey: step.step_key,
          answer: { value: selectedValue },
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
      <div className="text-center pt-2 md:pt-6">
        <h1 className="lt2-headline text-2xl md:text-4xl max-w-2xl mx-auto">
          {step.config.title}
        </h1>
        {step.config.subtitle ? (
          <p className="mt-2 text-[var(--lt2-muted)] text-sm md:text-base">
            {step.config.subtitle}
          </p>
        ) : null}
      </div>

      <div className="flex-1 flex items-center justify-center py-8">
        <div className="relative flex items-center gap-6">
          <div className="relative flex flex-col items-center">
            <button
              type="button"
              aria-label="Previous"
              onClick={() => goTo(selectedIndex - 1)}
              disabled={selectedIndex === 0}
              className="hidden md:flex absolute -top-9 z-10 h-8 w-12 items-center justify-center rounded-full text-[var(--lt2-muted)] hover:text-[var(--lt2-fg)] hover:bg-[var(--lt2-card)] disabled:opacity-30 transition"
            >
              <HiChevronUp className="w-5 h-5" />
            </button>

            {/* Highlight band centered on the selected row */}
            <div
              className="absolute left-0 right-0 pointer-events-none rounded-xl border border-[var(--lt2-fg)] bg-[var(--lt2-card)]"
              style={{
                top: `${((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT}px`,
                height: `${ITEM_HEIGHT}px`,
              }}
            />

            <div
              ref={scrollRef}
              onScroll={handleScroll}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  goTo(selectedIndex + 1);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  goTo(selectedIndex - 1);
                }
              }}
              className="overflow-y-auto no-scrollbar min-w-[140px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--lt2-fg)] rounded-xl relative"
              style={{
                height: `${VISIBLE_ITEMS * ITEM_HEIGHT}px`,
                scrollSnapType: "y mandatory",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <div style={{ height: `${((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT}px` }} />
              {values.map((num, i) => {
                const dist = Math.abs(i - selectedIndex);
                const isSelected = dist === 0;
                return (
                  <div
                    key={num}
                    className="flex items-center justify-center cursor-pointer relative z-10"
                    onClick={() => goTo(i)}
                    style={{ height: `${ITEM_HEIGHT}px`, scrollSnapAlign: "center" }}
                  >
                    <span
                      className={cn(
                        "lt2-headline tabular-nums select-none transition-all duration-150",
                        isSelected
                          ? "text-3xl md:text-4xl text-[var(--lt2-fg)]"
                          : dist === 1
                            ? "text-xl text-[var(--lt2-muted)] opacity-70"
                            : "text-lg text-[var(--lt2-muted)] opacity-30",
                      )}
                    >
                      {num}
                    </span>
                  </div>
                );
              })}
              <div style={{ height: `${((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT}px` }} />
            </div>

            <button
              type="button"
              aria-label="Next"
              onClick={() => goTo(selectedIndex + 1)}
              disabled={selectedIndex === values.length - 1}
              className="hidden md:flex absolute -bottom-9 z-10 h-8 w-12 items-center justify-center rounded-full text-[var(--lt2-muted)] hover:text-[var(--lt2-fg)] hover:bg-[var(--lt2-card)] disabled:opacity-30 transition"
            >
              <HiChevronDown className="w-5 h-5" />
            </button>
          </div>

          {step.config.unit_label ? (
            <span className="lt2-headline text-xl text-[var(--lt2-accent)]">
              {step.config.unit_label}
            </span>
          ) : null}
        </div>
      </div>

      {err ? (
        <p className="mb-2 text-sm text-rose-600 text-center">{err}</p>
      ) : null}

      <Cta onClick={handleContinue} disabled={busy}>
        {busy ? "Saving…" : step.config.cta_label ?? "Continue"}
      </Cta>
    </>
  );
}
