"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { postAnswer } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import type { StepProps } from "./types";

// Matches lovifymusic's CraftingExperienceStep feel: the fake-loader screen
// shown while "crafting your experience". We animate a progress bar +
// cycling messages for duration_ms, then auto-advance.
export function CraftingStep({ funnel, step, sessionId, onNext }: StepProps<"crafting">) {
  const messages = step.config.messages.length > 0
    ? step.config.messages
    : ["Crafting..."];
  const totalDuration = step.config.duration_ms;
  const perStep = Math.max(600, Math.floor(totalDuration / messages.length));

  const [activeIdx, setActiveIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  // Message cycler
  useEffect(() => {
    const t = setInterval(() => {
      setActiveIdx((v) => {
        if (v >= messages.length - 1) {
          clearInterval(t);
          return v;
        }
        return v + 1;
      });
    }, perStep);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Smooth progress ramp from 0 → 100 over totalDuration.
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / totalDuration) * 100);
      setProgress(pct);
      if (pct < 100) {
        requestAnimationFrame(tick);
      } else {
        setDone(true);
      }
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [totalDuration]);

  // Once done, record the step and advance after a beat so the user reads
  // the completion state.
  const router = useRouter();

  useEffect(() => {
    if (!done) return;
    (async () => {
      if (!sessionId) { router.push(`/${funnel.slug}`); return; }
      await postAnswer({
        sessionId,
        stepId: step.id,
        stepKey: step.step_key,
        answer: { completed: true },
      }).catch(() => {});
      setTimeout(() => onNext(), 700);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  return (
    <>
      <AnimatePresence mode="wait">
        {!done ? (
          <motion.h1
            key="crafting"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="font-display text-[1.6rem] font-extrabold text-foreground leading-tight text-left pt-10"
          >
            We are crafting your{" "}
            <span className="bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">
              experience
            </span>
            ...
          </motion.h1>
        ) : (
          <motion.h1
            key="done"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-[1.6rem] font-extrabold text-foreground leading-tight text-left pt-10"
          >
            Your{" "}
            <span className="bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">
              experience
            </span>{" "}
            is ready
          </motion.h1>
        )}
      </AnimatePresence>

      <div className="mt-10 space-y-4 flex-1">
        {messages.map((msg, idx) => {
          const isActive = idx === activeIdx && !done;
          const isDone = idx < activeIdx || done;
          return (
            <motion.div
              key={msg}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4 bg-card/80 backdrop-blur-sm transition-colors",
                isDone
                  ? "border-orange-400/40 text-foreground"
                  : isActive
                    ? "border-orange-400 text-foreground shadow-soft"
                    : "border-border/50 text-muted-foreground",
              )}
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center">
                {isDone ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </motion.span>
                ) : isActive ? (
                  <span className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
                ) : (
                  <span className="w-3 h-3 rounded-full border-2 border-muted-foreground/40" />
                )}
              </span>
              <span className="text-[15px] font-semibold">{msg}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Overall progress pill */}
      <div className="px-2 pb-6">
        <div className="h-1.5 w-full bg-secondary/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-rose-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </>
  );
}
