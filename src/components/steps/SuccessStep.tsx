"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Mail } from "lucide-react";
import { trackPixel } from "@/lib/pixel";
import type { FunnelStep, StepConfigByType } from "@/lib/funnel-types";

// Post-purchase confirmation. Matches lovifymusic's ExperienceCraftedStep
// feel: big circular check, warm headline, body copy, "check your email"
// nudge for the recovery link, and secondary links to the app stores.
export function SuccessStep({
  step,
  email,
  landingEventId,
}: {
  step: FunnelStep<"success"> & { config: StepConfigByType["success"] };
  email: string | null;
  landingEventId: string | null;
}) {
  useEffect(() => {
    trackPixel(
      "Purchase",
      { currency: "USD" },
      landingEventId ?? undefined,
    );
  }, [landingEventId]);

  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-[0_0_80px_hsl(15_85%_60%_/_0.5)]"
        >
          <CheckCircle className="h-10 w-10" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="font-display text-[1.8rem] font-extrabold text-foreground leading-tight"
        >
          {step.config.headline}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4 max-w-sm text-muted-foreground leading-relaxed"
        >
          {step.config.body_md}
        </motion.p>

        {step.config.show_set_password_cta ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mt-10 w-full max-w-xs rounded-2xl border border-orange-200/60 bg-orange-50/60 px-5 py-4"
          >
            <div className="flex items-start gap-3 text-left">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Check your email{email ? ` (${email})` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  We&apos;ve sent you a link to set your password and log into
                  the app. It can take a minute or two to arrive.
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 flex flex-col gap-3 sm:flex-row"
        >
          <a
            href={step.config.app_store_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground shadow-soft hover:border-orange-300 transition-colors"
          >
            Download on App Store
          </a>
          <a
            href={step.config.play_store_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground shadow-soft hover:border-orange-300 transition-colors"
          >
            Get it on Google Play
          </a>
        </motion.div>
      </div>
    </>
  );
}
