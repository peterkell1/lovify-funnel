"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiChevronUp, HiChevronDown } from "react-icons/hi2";
import { postAnswer } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { Cta } from "../Cta";
import type { StepProps } from "@/components/steps/types";

// Three-column time wheel for lovify-template-2. Hour (1-12) × minute
// (0..59 in `minute_step`) × AM/PM. Same answer shape as v1
// ({hour, minute, period, time}) so the webhook profile-projection
// logic remains unchanged.
const ITEM_HEIGHT = 56;
const VISIBLE_ITEMS = 5;

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function Wheel<T>({
  items,
  selectedIndex,
  setSelectedIndex,
  render,
  width = 80,
}: {
  items: readonly T[];
  selectedIndex: number;
  setSelectedIndex: (i: number) => void;
  render: (item: T) => React.ReactNode;
  width?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = selectedIndex * ITEM_HEIGHT;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / ITEM_HEIGHT);
    setSelectedIndex(Math.max(0, Math.min(items.length - 1, idx)));
  }, [items.length, setSelectedIndex]);

  const goTo = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    el.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: "smooth" });
  };

  return (
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
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); goTo(selectedIndex + 1); }
          else if (e.key === "ArrowUp") { e.preventDefault(); goTo(selectedIndex - 1); }
        }}
        className="overflow-y-auto no-scrollbar outline-none focus-visible:ring-2 focus-visible:ring-[var(--lt2-fg)] rounded-md"
        style={{
          height: `${VISIBLE_ITEMS * ITEM_HEIGHT}px`,
          width: `${width}px`,
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div style={{ height: `${((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT}px` }} />
        {items.map((item, i) => {
          const dist = Math.abs(i - selectedIndex);
          const isSelected = dist === 0;
          return (
            <div
              key={i}
              className="flex items-center justify-center cursor-pointer relative z-10"
              onClick={() => goTo(i)}
              style={{ height: `${ITEM_HEIGHT}px`, scrollSnapAlign: "center" }}
            >
              <span
                className={cn(
                  "lt2-headline tabular-nums select-none transition-all duration-150",
                  isSelected
                    ? "text-2xl md:text-3xl text-[var(--lt2-fg)]"
                    : dist === 1
                      ? "text-xl text-[var(--lt2-muted)] opacity-70"
                      : "text-lg text-[var(--lt2-muted)] opacity-30",
                )}
              >
                {render(item)}
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
        disabled={selectedIndex === items.length - 1}
        className="hidden md:flex absolute -bottom-9 z-10 h-8 w-12 items-center justify-center rounded-full text-[var(--lt2-muted)] hover:text-[var(--lt2-fg)] hover:bg-[var(--lt2-card)] disabled:opacity-30 transition"
      >
        <HiChevronDown className="w-5 h-5" />
      </button>
    </div>
  );
}

export function TimePickerStep({ step, sessionId, onNext, priorAnswers }: StepProps<"time-picker">) {
  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const minuteStep = step.config.minute_step || 5;
  const minutes = useMemo(() => {
    const out: number[] = [];
    for (let m = 0; m < 60; m += minuteStep) out.push(m);
    return out;
  }, [minuteStep]);
  const periods = useMemo(() => ["AM", "PM"] as const, []);

  const saved = priorAnswers[step.step_key] as { hour?: number; minute?: number; period?: string } | undefined;
  const defaultHourIdx = Math.max(0, hours.indexOf(saved?.hour ?? step.config.default_hour ?? 9));
  const snappedDefaultMin = Math.round((saved?.minute ?? step.config.default_minute ?? 0) / minuteStep) * minuteStep;
  const defaultMinIdx = Math.max(0, minutes.indexOf(snappedDefaultMin));
  const defaultPeriodIdx = (saved?.period ?? step.config.default_period) === "PM" ? 1 : 0;

  const [hourIdx, setHourIdx] = useState(defaultHourIdx);
  const [minIdx, setMinIdx] = useState(defaultMinIdx);
  const [periodIdx, setPeriodIdx] = useState(defaultPeriodIdx);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleContinue = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    const hour = hours[hourIdx];
    const minute = minutes[minIdx];
    const period = periods[periodIdx];
    const time = `${hour}:${pad2(minute)} ${period}`;
    try {
      if (sessionId) {
        await postAnswer({
          sessionId,
          stepId: step.id,
          stepKey: step.step_key,
          answer: { time, hour, minute, period },
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
          <p className="mt-2 text-[var(--lt2-muted)] text-sm md:text-base max-w-xl mx-auto">
            {step.config.subtitle}
          </p>
        ) : null}
      </div>

      <div className="flex-1 flex items-center justify-center py-8">
        <div className="relative flex items-center gap-1">
          <div
            className="absolute left-0 right-0 pointer-events-none rounded-xl border border-[var(--lt2-fg)] bg-[var(--lt2-card)]"
            style={{
              top: `${((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT}px`,
              height: `${ITEM_HEIGHT}px`,
            }}
          />
          <Wheel items={hours} selectedIndex={hourIdx} setSelectedIndex={setHourIdx} render={(h) => h} width={70} />
          <span className="lt2-headline text-2xl text-[var(--lt2-fg)] px-1 z-10 relative">:</span>
          <Wheel items={minutes} selectedIndex={minIdx} setSelectedIndex={setMinIdx} render={(m) => pad2(m)} width={70} />
          <Wheel items={periods} selectedIndex={periodIdx} setSelectedIndex={setPeriodIdx} render={(p) => p} width={70} />
        </div>
      </div>

      {err ? <p className="mb-2 text-sm text-rose-600 text-center">{err}</p> : null}

      <Cta onClick={handleContinue} disabled={busy}>
        {busy ? "Saving…" : step.config.cta_label ?? "Continue"}
      </Cta>
    </>
  );
}
