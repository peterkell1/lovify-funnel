"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { postAnswer } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import type { StepProps } from "./types";

// iPhone-style scroll wheel, ported from lovifymusic's MonthlyGoalStep.
// The values array is built dynamically from min/max/step so admins can
// reuse this step type for any numeric range (minutes per day, number of
// songs per week, etc.).
const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;

export function NumberPickerStep({
  funnel,
  step,
  sessionId,
  onNext,
}: StepProps<"number-picker">) {
  const values = useMemo(() => {
    const out: number[] = [];
    for (let v = step.config.min; v <= step.config.max; v += step.config.step || 1) {
      out.push(v);
    }
    return out;
  }, [step.config.min, step.config.max, step.config.step]);

  const defaultIndex = Math.max(
    0,
    values.indexOf(step.config.default ?? values[Math.floor(values.length / 2)]),
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
    const clamped = Math.max(0, Math.min(values.length - 1, idx));
    setSelectedIndex(clamped);
  }, [values.length]);

  const goTo = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(values.length - 1, idx));
    el.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: "smooth" });
  }, [values.length]);

  const selectedValue = values[selectedIndex];

  const router = useRouter();

  const handleContinue = async () => {
    if (busy) return;
    if (!sessionId) { router.push(`/${funnel.slug}`); return; }
    setBusy(true);
    setErr(null);
    try {
      await postAnswer({
        sessionId,
        stepId: step.id,
        stepKey: step.step_key,
        answer: { value: selectedValue },
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
          <p className="text-sm text-muted-foreground mt-2">
            {step.config.subtitle}
          </p>
        ) : null}
      </motion.div>

      <div className="flex-1 flex items-center justify-center">
        <motion.div
          className="relative flex items-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {/* Highlight bar behind the centered row */}
          <div
            className="absolute left-0 right-0 pointer-events-none border-y-2 border-orange-400/30"
            style={{
              top: `${((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT}px`,
              height: `${ITEM_HEIGHT}px`,
            }}
          />

          <div className="relative flex flex-col items-center">
            <button
              type="button"
              aria-label="Previous"
              onClick={() => goTo(selectedIndex - 1)}
              disabled={selectedIndex === 0}
              className="hidden md:flex absolute -top-7 z-10 h-7 w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/5 disabled:opacity-30 disabled:hover:bg-transparent"
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
              className="overflow-y-auto no-scrollbar min-w-[120px] outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40 rounded-md"
              style={{
                height: `${VISIBLE_ITEMS * ITEM_HEIGHT}px`,
                scrollSnapType: "y mandatory",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {/* Top padding so item 0 can snap to center */}
              <div style={{ height: `${((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT}px` }} />

              {values.map((num, i) => {
                const dist = Math.abs(i - selectedIndex);
                const isSelected = dist === 0;
                const opacity = isSelected ? 1 : dist === 1 ? 0.5 : 0.25;
                const scale = isSelected ? 1.15 : dist === 1 ? 0.95 : 0.8;

                return (
                  <div
                    key={num}
                    className="flex items-center justify-center cursor-pointer"
                    onClick={() => goTo(i)}
                    style={{
                      height: `${ITEM_HEIGHT}px`,
                      scrollSnapAlign: "center",
                    }}
                  >
                    <span
                      className={cn(
                        "font-display font-extrabold tabular-nums transition-all duration-150 select-none",
                        isSelected
                          ? "text-foreground text-3xl"
                          : "text-muted-foreground text-2xl",
                      )}
                      style={{ opacity, transform: `scale(${scale})` }}
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
              className="hidden md:flex absolute -bottom-7 z-10 h-7 w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/5 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {step.config.unit_label ? (
            <span className="text-lg font-semibold text-orange-500">
              {step.config.unit_label}
            </span>
          ) : null}
        </motion.div>
      </div>

      {err ? (
        <p className="mb-2 text-sm text-destructive text-center">{err}</p>
      ) : null}

      <div className="pb-8 relative z-20">
        <Button onClick={handleContinue} disabled={busy}>
          {busy ? "Saving…" : "Continue"}
          {!busy ? <ArrowRight className="w-5 h-5" /> : null}
        </Button>
      </div>
    </>
  );
}
