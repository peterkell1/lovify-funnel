"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { postAnswer } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import type { StepProps } from "./types";

// Three-column scroll wheel: hour (1-12) × minute (0..59 in minute_step) × AM/PM.
// Same physics as NumberPickerStep — fixed item height, scroll-snap, opacity
// and scale based on distance from the centered row.
const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function Wheel<T>({
  items,
  selectedIndex,
  setSelectedIndex,
  render,
}: {
  items: readonly T[];
  selectedIndex: number;
  setSelectedIndex: (i: number) => void;
  render: (item: T, isSelected: boolean) => React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = selectedIndex * ITEM_HEIGHT;
    // only sync on mount; user scroll drives subsequent changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    setSelectedIndex(clamped);
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
        className="hidden md:flex absolute -top-7 z-10 h-7 w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/5 disabled:opacity-30"
      >
        <ChevronUp className="w-5 h-5" />
      </button>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); goTo(selectedIndex + 1); }
          else if (e.key === "ArrowUp") { e.preventDefault(); goTo(selectedIndex - 1); }
        }}
        className="overflow-y-auto no-scrollbar min-w-[72px] outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40 rounded-md"
        style={{
          height: `${VISIBLE_ITEMS * ITEM_HEIGHT}px`,
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div style={{ height: `${((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT}px` }} />
        {items.map((item, i) => {
          const dist = Math.abs(i - selectedIndex);
          const isSelected = dist === 0;
          const opacity = isSelected ? 1 : dist === 1 ? 0.5 : 0.25;
          const scale = isSelected ? 1.1 : dist === 1 ? 0.95 : 0.8;
          return (
            <div
              key={i}
              className="flex items-center justify-center cursor-pointer"
              onClick={() => goTo(i)}
              style={{ height: `${ITEM_HEIGHT}px`, scrollSnapAlign: "center" }}
            >
              <span
                className={cn(
                  "font-display font-extrabold tabular-nums transition-all duration-150 select-none",
                  isSelected ? "text-foreground text-2xl" : "text-muted-foreground text-xl",
                )}
                style={{ opacity, transform: `scale(${scale})` }}
              >
                {render(item, isSelected)}
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
        className="hidden md:flex absolute -bottom-7 z-10 h-7 w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/5 disabled:opacity-30"
      >
        <ChevronDown className="w-5 h-5" />
      </button>
    </div>
  );
}

export function TimePickerStep({
  funnel,
  step,
  sessionId,
  onNext,
}: StepProps<"time-picker">) {
  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const minuteStep = step.config.minute_step || 5;
  const minutes = useMemo(() => {
    const out: number[] = [];
    for (let m = 0; m < 60; m += minuteStep) out.push(m);
    return out;
  }, [minuteStep]);
  const periods = useMemo(() => ["AM", "PM"] as const, []);

  const defaultHourIdx = Math.max(0, hours.indexOf(step.config.default_hour || 9));
  const snappedDefaultMin = Math.round((step.config.default_minute || 0) / minuteStep) * minuteStep;
  const defaultMinIdx = Math.max(0, minutes.indexOf(snappedDefaultMin));
  const defaultPeriodIdx = step.config.default_period === "PM" ? 1 : 0;

  const [hourIdx, setHourIdx] = useState(defaultHourIdx);
  const [minIdx, setMinIdx] = useState(defaultMinIdx);
  const [periodIdx, setPeriodIdx] = useState(defaultPeriodIdx);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const router = useRouter();

  const handleContinue = async () => {
    if (busy) return;
    if (!sessionId) { router.push(`/${funnel.slug}`); return; }
    setBusy(true);
    setErr(null);
    const hour = hours[hourIdx];
    const minute = minutes[minIdx];
    const period = periods[periodIdx];
    const time = `${hour}:${pad2(minute)} ${period}`;
    try {
      await postAnswer({
        sessionId,
        stepId: step.id,
        stepKey: step.step_key,
        answer: { time, hour, minute, period },
      });
      onNext();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <>
      <motion.div
        className="pt-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="font-display text-xl font-extrabold text-foreground leading-snug">
          {step.config.title}
        </h1>
        {step.config.subtitle ? (
          <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
            {step.config.subtitle}
          </p>
        ) : null}
      </motion.div>

      <div className="flex-1 flex items-center justify-center">
        <motion.div
          className="relative flex items-center gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div
            className="absolute left-0 right-0 pointer-events-none rounded-lg bg-foreground/5"
            style={{
              top: `${((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT}px`,
              height: `${ITEM_HEIGHT}px`,
            }}
          />

          <Wheel
            items={hours}
            selectedIndex={hourIdx}
            setSelectedIndex={setHourIdx}
            render={(h) => h}
          />
          <span className="font-display text-2xl font-extrabold text-foreground">:</span>
          <Wheel
            items={minutes}
            selectedIndex={minIdx}
            setSelectedIndex={setMinIdx}
            render={(m) => pad2(m)}
          />
          <Wheel
            items={periods}
            selectedIndex={periodIdx}
            setSelectedIndex={setPeriodIdx}
            render={(p) => p}
          />
        </motion.div>
      </div>

      {err ? (
        <p className="mb-2 text-sm text-destructive text-center">{err}</p>
      ) : null}

      <div className="pb-8 relative z-20">
        <Button onClick={handleContinue} disabled={busy}>
          {busy ? "Saving…" : step.config.cta_label ?? "Continue"}
          {!busy ? <ArrowRight className="w-5 h-5" /> : null}
        </Button>
      </div>
    </>
  );
}
