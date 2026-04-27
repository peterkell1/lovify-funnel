"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { postAnswer } from "@/lib/client-api";
import { interpolate } from "@/lib/interpolate";
import { pickStepImage } from "@/lib/assets";
import type { StepProps } from "./types";

// Reassurance / social-proof / "echo your answer back" screen. No input,
// just image + copy + continue. Title and subtitle can reference earlier
// answers via {{answer.<step_key>}} tokens so the screen reads like
// "You're already listening. Just switch to Lovify for {{answer.monthly}} minutes a day".
export function NarrativeStep({
  funnel,
  step,
  sessionId,
  onNext,
  priorAnswers,
}: StepProps<"narrative">) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const title = interpolate(step.config.title, priorAnswers);
  const subtitle = step.config.subtitle
    ? interpolate(step.config.subtitle, priorAnswers)
    : null;
  const imageUrl = pickStepImage(step.config);

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
        answer: { acknowledged: true },
      });
      onNext();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {step.config.hero_emoji && !imageUrl ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.5, type: "spring", stiffness: 200 }}
            className="text-7xl mb-6 drop-shadow-lg"
          >
            {step.config.hero_emoji}
          </motion.div>
        ) : null}

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="font-display text-[1.7rem] font-extrabold text-foreground leading-tight max-w-sm"
        >
          {title}
        </motion.h1>

        {subtitle ? (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="text-muted-foreground text-base leading-relaxed max-w-xs mt-3"
          >
            {subtitle}
          </motion.p>
        ) : null}

        {imageUrl ? (
          <motion.img
            src={imageUrl}
            alt=""
            className="w-64 h-64 object-contain mt-6 drop-shadow-lg"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.5, type: "spring", stiffness: 200 }}
          />
        ) : null}

        {step.config.bullets && step.config.bullets.length > 0 ? (
          <motion.ul
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="mt-6 flex flex-col gap-4 text-left w-full max-w-sm"
          >
            {step.config.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-3">
                {b.emoji ? <span className="text-xl leading-none mt-0.5">{b.emoji}</span> : null}
                <span className="text-[15px] text-foreground leading-snug">{b.text}</span>
              </li>
            ))}
          </motion.ul>
        ) : null}

        {step.config.footer_note ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 text-xs text-muted-foreground"
          >
            {step.config.footer_note}
          </motion.p>
        ) : null}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75 }}
        className="pb-8"
      >
        <Button onClick={handleContinue} disabled={busy}>
          {step.config.cta_label ?? "Continue"}
          <ArrowRight className="w-5 h-5" />
        </Button>
        {err ? (
          <p className="mt-3 text-sm text-destructive text-center">{err}</p>
        ) : null}
      </motion.div>
    </>
  );
}
