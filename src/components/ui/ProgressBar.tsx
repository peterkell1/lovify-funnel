"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

// Lovifymusic-style onboarding progress bar: a single thin pill that fills
// left-to-right as the user advances through steps.
export function ProgressBar({
  current,
  total,
  className,
}: {
  current: number;
  total: number;
  className?: string;
}) {
  const pct = total > 0 ? ((current + 1) / total) * 100 : 0;
  return (
    <div className={cn("px-4 pt-4", className)}>
      <div className="h-1.5 w-full bg-secondary/60 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-orange-500 to-rose-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
