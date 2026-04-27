"use client";

import { useEffect } from "react";
import { HiCheck, HiOutlineEnvelope } from "react-icons/hi2";
import { trackPixel } from "@/lib/pixel";
import type { FunnelStep, StepConfigByType } from "@/lib/funnel-types";

// Post-purchase confirmation in lovify-template-2 styling. Wider
// layout, dark filled check, "we sent your email to ..." reassurance,
// store buttons read from step.config.app_store_url / play_store_url
// (existing schema, no changes needed).
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
    trackPixel("Purchase", { currency: "USD" }, landingEventId ?? undefined);
  }, [landingEventId]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto w-full py-8">
      <div className="mb-6 h-16 w-16 rounded-full bg-[var(--lt2-cta-bg)] text-[var(--lt2-cta-fg)] flex items-center justify-center">
        <HiCheck className="h-7 w-7" />
      </div>
      <h1 className="lt2-headline text-3xl md:text-4xl">{step.config.headline}</h1>
      <p className="mt-3 text-[var(--lt2-muted)] text-base md:text-lg leading-relaxed max-w-md">
        {step.config.body_md}
      </p>

      {step.config.show_set_password_cta ? (
        <div className="mt-8 lt2-card p-5 flex items-start gap-3 text-left max-w-md w-full">
          <HiOutlineEnvelope className="h-5 w-5 mt-0.5 flex-shrink-0 text-[var(--lt2-accent)]" />
          <div>
            <p className="text-sm font-semibold">
              Check your email
              {email ? (
                <>
                  {" "}
                  <span className="text-[var(--lt2-accent)]">({email})</span>
                </>
              ) : null}
            </p>
            <p className="mt-1 text-xs text-[var(--lt2-muted)] leading-relaxed">
              We&apos;ve sent you a link to set your password and log into the app. It can take a minute or two to arrive.
            </p>
          </div>
        </div>
      ) : null}

      {step.config.app_store_url || step.config.play_store_url ? (
        <div className="mt-8 flex flex-col gap-3 w-full max-w-sm">
          {step.config.app_store_url ? (
            <a
              href={step.config.app_store_url}
              target="_blank"
              rel="noopener noreferrer"
              className="lt2-cta inline-flex flex-col items-center justify-center h-14 px-6 w-full"
            >
              <span className="text-[10px] font-medium opacity-70 uppercase tracking-widest">Download on the</span>
              <span className="text-base font-bold">App Store</span>
            </a>
          ) : null}
          {step.config.play_store_url ? (
            <a
              href={step.config.play_store_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-col items-center justify-center h-14 px-6 w-full rounded-full border-2 border-[var(--lt2-fg)] text-[var(--lt2-fg)] transition hover:-translate-y-px"
            >
              <span className="text-[10px] font-medium opacity-60 uppercase tracking-widest">Get it on</span>
              <span className="text-base font-bold">Google Play</span>
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
