"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Cta } from "../Cta";
import type { StepProps } from "@/components/steps/types";

export function EmailCaptureStep({
  funnel,
  step,
  onNext,
  priorAnswers,
}: StepProps<"email-capture">) {
  const seeded =
    (priorAnswers[step.step_key] as { email?: string } | undefined)?.email ?? "";
  const [email, setEmail] = useState(seeded);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleBlur = async () => {
    const trimmed = email.trim();
    if (!trimmed || !/.+@.+\..+/.test(trimmed)) return;
    try {
      const res = await fetch(
        `/api/sessions?email=${encodeURIComponent(trimmed)}&funnelId=${encodeURIComponent(funnel.id)}`
      );
      if (res.ok) {
        const { taken } = await res.json();
        if (taken) setErr("This email is already associated with an active subscription.");
        else setErr(null);
      }
    } catch {
      // silently ignore — submit will catch real errors
    }
  };

  const submit = async () => {
    if (busy || err) return;
    if (!/.+@.+\..+/.test(email)) {
      setErr("Enter a valid email");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          funnelId: funnel.id,
          stepKey: step.step_key,
          email,
        }),
      });
      if (!res.ok) {
        setErr(
          res.status === 409
            ? "This email is already associated with an active subscription."
            : "Something went wrong. Please try again."
        );
        setBusy(false);
        return;
      }
      onNext();
    } catch {
      setErr("Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full pt-6 md:pt-12">
        <h1 className="lt2-headline text-2xl md:text-4xl text-center">
          {step.config.title}
        </h1>
        {step.config.subtitle ? (
          <p className="mt-3 text-center text-[var(--lt2-muted)] text-sm md:text-base leading-relaxed">
            {step.config.subtitle}
          </p>
        ) : null}
        <div className="mt-8">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="you@example.com"
            className="w-full h-14 rounded-xl border border-[var(--lt2-border)] bg-white px-5 text-base focus:outline-none focus:border-[var(--lt2-fg)] transition-colors placeholder:text-[var(--lt2-muted)]"
          />
          {(step.config.terms_url || step.config.privacy_url) ? (
            <p className="mt-3 flex items-start gap-2 text-xs text-[var(--lt2-muted)] leading-relaxed">
              <Lock className="h-3.5 w-3.5 flex-shrink-0 mt-px" />
              <span>
                {step.config.terms_url && step.config.privacy_url ? (
                  <>By continuing you agree to our{" "}
                    <a href={step.config.terms_url} target="_blank" rel="noreferrer" className="underline hover:text-[var(--lt2-fg)]">Terms</a>
                    {" "}and{" "}
                    <a href={step.config.privacy_url} target="_blank" rel="noreferrer" className="underline hover:text-[var(--lt2-fg)]">Privacy Policy</a>.</>
                ) : step.config.terms_url ? (
                  <>By continuing you agree to our{" "}
                    <a href={step.config.terms_url} target="_blank" rel="noreferrer" className="underline hover:text-[var(--lt2-fg)]">Terms of Service</a>.</>
                ) : (
                  <>We respect your privacy and process your data per our{" "}
                    <a href={step.config.privacy_url} target="_blank" rel="noreferrer" className="underline hover:text-[var(--lt2-fg)]">Privacy Policy</a>.</>
                )}
              </span>
            </p>
          ) : null}
        </div>
        {err ? <p className="mt-3 text-sm text-rose-600 text-center">{err}</p> : null}
      </div>
      <Cta onClick={submit} disabled={busy || !!err}>
        {busy ? "Saving…" : step.config.cta_label ?? "Continue"}
      </Cta>
    </>
  );
}
