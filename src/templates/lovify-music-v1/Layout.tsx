"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PhoneFrame } from "@/components/ui/PhoneFrame";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { TemplateLayoutProps } from "@/templates/types";

// lovify-music-v1 chrome: phone frame on every viewport, progress bar
// pinned to the top, slide-in animation per step. Mobile-first onboarding
// look. Future templates can render full-bleed shells, split-screen
// layouts, etc.
export function Layout({
  step,
  stepIndex,
  totalSteps,
  hideProgress,
  children,
}: TemplateLayoutProps) {
  return (
    <PhoneFrame>
      {hideProgress ? null : (
        <div className="flex-shrink-0 -mx-6">
          <ProgressBar current={stepIndex} total={totalSteps} />
        </div>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.step_key}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25 }}
          className="flex-1 flex flex-col min-h-0"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </PhoneFrame>
  );
}
