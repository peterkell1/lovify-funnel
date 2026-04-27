"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { postAnswer } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import type { StepProps } from "./types";

// Two modes:
//   1. Binary  — quote card + Yes / No row (the original behavior).
//   2. Likert  — 1..max numbered tap-cards with min/max anchor labels
//      under the ends. Active when step.config.scale is set.
//
// Both write `answer.value` (number for Likert, "yes"/"no" for binary)
// so the webhook profile-projection map handles either uniformly.
export function StatementStep({
  funnel,
  step,
  sessionId,
  onNext,
}: StepProps<"statement">) {
  const router = useRouter();
  const isLikert = !!step.config.scale && step.config.scale.max >= 2;
  const [pending, setPending] = useState<string | number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (value: number | "yes" | "no") => {
    if (pending !== null) return;
    if (!sessionId) { router.push(`/${funnel.slug}`); return; }
    setPending(value);
    setErr(null);
    try {
      await postAnswer({
        sessionId,
        stepId: step.id,
        stepKey: step.step_key,
        answer:
          typeof value === "number"
            ? { value }
            : { value, relates: value === "yes" },
      });
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

      {step.config.statement ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex-1 flex items-center justify-center"
        >
          <div className="relative rounded-2xl bg-foreground/10 px-6 py-6 max-w-xs">
            <span className="absolute top-2 left-3 text-2xl text-foreground/40 leading-none">
              &ldquo;
            </span>
            <p className="text-foreground text-base leading-relaxed pl-4">
              {step.config.statement}
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="flex-1" />
      )}

      {isLikert ? (
        <LikertRow
          max={step.config.scale!.max}
          minLabel={step.config.scale!.min_label}
          maxLabel={step.config.scale!.max_label}
          pending={typeof pending === "number" ? pending : null}
          onPick={submit}
        />
      ) : (
        <BinaryRow
          pending={typeof pending === "string" ? pending : null}
          onPick={submit}
        />
      )}

      {err ? (
        <p className="mb-4 -mt-4 text-sm text-destructive text-center">{err}</p>
      ) : null}
    </>
  );
}

function BinaryRow({
  pending,
  onPick,
}: {
  pending: string | null;
  onPick: (v: "yes" | "no") => void;
}) {
  return (
    <div className="flex gap-3 pb-8">
      {(["no", "yes"] as const).map((v) => {
        const isSelected = pending === v;
        const Icon = v === "yes" ? Check : X;
        const iconColor = v === "yes" ? "text-emerald-500" : "text-orange-500";
        return (
          <motion.button
            key={v}
            whileTap={{ scale: 0.95 }}
            disabled={!!pending}
            onClick={() => onPick(v)}
            className={cn(
              "flex-1 py-4 rounded-xl font-semibold flex flex-col items-center gap-1 transition-colors duration-200",
              isSelected
                ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/30 border border-orange-400"
                : "bg-foreground/5 text-foreground border border-foreground/15 hover:border-foreground/30",
            )}
          >
            <Icon className={cn("w-5 h-5", isSelected ? "text-white" : iconColor)} />
            <span className="text-sm capitalize">{v}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

function LikertRow({
  max,
  minLabel,
  maxLabel,
  pending,
  onPick,
}: {
  max: number;
  minLabel?: string;
  maxLabel?: string;
  pending: number | null;
  onPick: (v: number) => void;
}) {
  const values = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <div className="pb-8">
      <div className="flex items-center justify-center gap-2">
        {values.map((v) => {
          const isSelected = pending === v;
          return (
            <motion.button
              key={v}
              whileTap={{ scale: 0.92 }}
              disabled={pending !== null}
              onClick={() => onPick(v)}
              className={cn(
                "w-12 h-12 rounded-xl font-display font-extrabold text-lg flex items-center justify-center transition-all duration-150",
                isSelected
                  ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/30 border border-orange-400"
                  : "bg-foreground/5 text-foreground border border-foreground/15 hover:border-foreground/30",
              )}
            >
              {v}
            </motion.button>
          );
        })}
      </div>
      {minLabel || maxLabel ? (
        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground px-1">
          <span>{minLabel ?? ""}</span>
          <span>{maxLabel ?? ""}</span>
        </div>
      ) : null}
    </div>
  );
}
