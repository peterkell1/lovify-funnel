"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { postAnswer } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import type { StepProps } from "./types";

// Multi-select list. Matches lovifymusic's MindsetQuizStep "goals" layout:
// scrollable 1-column list of option rows, each with an emoji + label + a
// circular checkbox, and a Continue CTA pinned at the bottom that only
// lights up once the user has made the minimum number of selections.
export function QuizMultiStep({
  funnel,
  step,
  sessionId,
  onNext,
}: StepProps<"quiz-multi">) {
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
      <h1 className="font-display text-xl font-extrabold text-foreground text-center leading-snug pt-8">
        {step.config.title}
      </h1>
      {step.config.subtitle ? (
        <p className="text-sm text-muted-foreground text-center mt-2 leading-relaxed">
          {step.config.subtitle}
        </p>
      ) : null}

      {/* Scrollable list so long option sets stay usable on small phones. */}
      <div className="overflow-y-auto no-scrollbar -mx-1 px-1 pb-2 mt-6 flex flex-col gap-[10px] flex-1">
        {step.config.options.map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <motion.button
              key={opt.value}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggle(opt.value)}
              className={cn(
                "flex items-center gap-3 py-[14px] px-4 rounded-xl text-left text-[15px] font-semibold transition-colors duration-200",
                isSelected
                  ? "bg-orange-500/15 border-2 border-orange-400 text-foreground"
                  : "bg-foreground/5 border-2 border-transparent text-foreground hover:border-foreground/15",
              )}
            >
              {opt.emoji ? (
                <span className="text-xl flex-shrink-0">{opt.emoji}</span>
              ) : null}
              <span className="flex-1">{opt.label}</span>
              <span
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                  isSelected
                    ? "bg-orange-500 text-white"
                    : "border-2 border-foreground/20",
                )}
              >
                {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
              </span>
            </motion.button>
          );
        })}
      </div>

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
