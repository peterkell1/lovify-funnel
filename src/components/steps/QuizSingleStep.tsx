"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { postAnswer } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import type { StepProps } from "./types";

// Auto-advance single-select quiz. Matches lovifymusic's MindsetQuizStep
// behaviour: pick one → 300ms highlight → move to the next step.
// Horizontal layout (gender) uses 3 equal-width columns; vertical layout
// (mindset, age) stacks full-width buttons.
export function QuizSingleStep({
  funnel,
  step,
  sessionId,
  onNext,
}: StepProps<"quiz-single">) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const isHorizontal = step.config.layout === "horizontal";

  const handleSelect = async (value: string) => {
    if (pending) return;
    if (!sessionId) {
      // No session means the email step was never completed — send back.
      router.push(`/${funnel.slug}`);
      return;
    }
    setPending(value);
    setErr(null);
    try {
      await postAnswer({
        sessionId,
        stepId: step.id,
        stepKey: step.step_key,
        answer: { value },
      });
      // Short highlight before advancing so the user sees their selection land.
      setTimeout(() => onNext(), 300);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setPending(null);
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

      <div
        className={cn(
          "mt-8",
          isHorizontal ? "flex gap-3" : "flex flex-col gap-[10px]",
        )}
      >
        {step.config.options.map((opt) => {
          const isSelected = pending === opt.value;
          return (
            <motion.button
              key={opt.value}
              whileTap={{ scale: isHorizontal ? 0.95 : 0.97 }}
              disabled={!!pending}
              onClick={() => handleSelect(opt.value)}
              className={cn(
                "py-[14px] px-6 rounded-xl text-[15px] font-semibold transition-colors duration-200",
                isHorizontal ? "flex-1 text-center" : "text-left",
                isSelected
                  ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/30 border border-orange-400"
                  : "bg-foreground/5 text-foreground border border-foreground/15 hover:border-foreground/30",
              )}
            >
              {opt.emoji && !isHorizontal ? (
                <span className="inline-flex items-center gap-3">
                  <span className="text-xl">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </span>
              ) : (
                opt.label
              )}
            </motion.button>
          );
        })}
      </div>

      {err ? (
        <p className="mt-4 text-sm text-destructive text-center">{err}</p>
      ) : null}

      {!step.config.required && !isHorizontal ? (
        <button
          onClick={() => handleSelect("")}
          disabled={!!pending}
          className="mt-4 text-center text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          Prefer not to say
        </button>
      ) : null}
    </>
  );
}
