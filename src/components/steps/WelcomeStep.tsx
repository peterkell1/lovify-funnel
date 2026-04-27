"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { postAnswer } from "@/lib/client-api";
import { pickStepImage } from "@/lib/assets";
import type { StepProps } from "./types";

// Narrative hero step (welcome / great-job / experience-crafted family).
// Staggered fade-ins for the emoji → title → body → CTA match lovifymusic's
// ExperienceCraftedStep / GreatJobStep patterns.
export function WelcomeStep({ step, sessionId, onNext }: StepProps<"welcome">) {
  const [busy, setBusy] = useState(false);

  const handleContinue = async () => {
    if (busy) return;
    setBusy(true);
    if (sessionId) {
      await postAnswer({
        sessionId,
        stepId: step.id,
        stepKey: step.step_key,
        answer: { acknowledged: true },
      }).catch(() => {});
    }
    onNext();
  };

  const imageUrl = pickStepImage(step.config);

  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {step.config.hero_emoji && !imageUrl ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.5, type: "spring", stiffness: 200 }}
            className="text-7xl mb-8 drop-shadow-lg"
          >
            {step.config.hero_emoji}
          </motion.div>
        ) : null}

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="font-display text-[1.8rem] font-extrabold text-foreground leading-tight"
        >
          {step.config.title}
        </motion.h1>

        {step.config.subtitle ? (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="text-muted-foreground text-base leading-relaxed max-w-xs mt-3"
          >
            {step.config.subtitle}
          </motion.p>
        ) : null}

        {step.config.body_md ? (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="text-muted-foreground leading-relaxed max-w-sm mt-4"
          >
            {step.config.body_md}
          </motion.p>
        ) : null}

        {imageUrl ? (
          <motion.img
            src={imageUrl}
            alt=""
            className="rounded-2xl w-full max-w-md max-h-[320px] object-contain mt-6 drop-shadow-lg"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.5, type: "spring", stiffness: 200 }}
          />
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
        </Button>
      </motion.div>
    </>
  );
}
