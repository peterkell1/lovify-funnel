"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { postAnswer } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import type { StepProps } from "./types";

// Matches lovifymusic's GenrePickerStep: wrapped pill buttons that toggle
// on click, with a selection-count line below the pills and a pinned
// Continue CTA.
export function GenrePickerStep({
  funnel,
  step,
  sessionId,
  onNext,
}: StepProps<"genre-picker">) {
  const router = useRouter();
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
    if (!sessionId) { router.push(`/${funnel.slug}`); return; }
    setBusy(true);
    setErr(null);
    try {
      await postAnswer({
        sessionId,
        stepId: step.id,
        stepKey: step.step_key,
        answer: { values: selected },
      });
      onNext();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className="font-display text-xl font-extrabold text-foreground text-center leading-snug pt-8 mb-2">
        {step.config.title}
      </h1>
      {step.config.subtitle ? (
        <p className="text-sm text-muted-foreground text-center mb-6 leading-relaxed">
          {step.config.subtitle}
        </p>
      ) : null}

      <div className="flex-1 overflow-y-auto no-scrollbar py-4">
        <div className="flex flex-wrap justify-center gap-2.5">
          {step.config.genres.map((g) => {
            const isSelected = selected.includes(g.value);
            return (
              <motion.button
                key={g.value}
                whileTap={{ scale: 0.96 }}
                onClick={() => toggle(g.value)}
                className={cn(
                  "px-5 py-3 rounded-full border-2 flex items-center gap-2 text-[0.9rem] font-semibold transition-colors",
                  isSelected
                    ? "border-orange-400 bg-orange-500/15 shadow-sm text-foreground"
                    : "border-border/60 bg-card/50 text-foreground hover:border-orange-300",
                )}
              >
                {g.emoji ? <span className="text-base">{g.emoji}</span> : null}
                <span>{g.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <p className="text-sm text-muted-foreground text-center mt-2">
        {selected.length === 0
          ? `Select at least ${step.config.min} to continue`
          : `${selected.length} selected`}
      </p>

      {err ? (
        <p className="mt-2 text-sm text-destructive text-center">{err}</p>
      ) : null}

      <div className="pt-4 pb-2">
        <Button onClick={handleContinue} disabled={!canContinue}>
          {busy ? "Saving…" : "Continue"}
        </Button>
      </div>
    </>
  );
}
