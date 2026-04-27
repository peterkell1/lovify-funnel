"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { trackPixel } from "@/lib/pixel";
import type { StepProps } from "./types";

// Lead-in step. Email capture lives up-front so ad-attributed leads get
// identified as early as possible — even the ones who abandon the quiz
// later show up as addressable contacts.
export function EmailCaptureStep({ funnel, step, onNext }: StepProps<"email-capture">) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBlur = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(
        `/api/sessions?email=${encodeURIComponent(trimmed)}&funnelId=${encodeURIComponent(funnel.id)}`
      );
      if (res.ok) {
        const { taken } = await res.json();
        if (taken) {
          setError("This email is already associated with an active subscription.");
        } else {
          setError(null);
        }
      }
    } catch {
      // silently ignore — POST submit will catch real errors
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting || error) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          funnelId: funnel.id,
          stepKey: step.step_key,
          email: email.trim(),
        }),
      });
      if (!res.ok) {
        if (res.status === 409) {
          setError("This email is already associated with an active subscription.");
        } else {
          setError("Something went wrong. Please try again.");
        }
        setSubmitting(false);
        return;
      }
      trackPixel("Lead", { content_name: "email_capture" });
      onNext();
      router.refresh();
    } catch (err) {
      void err;
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex-1 flex flex-col justify-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-500 text-center"
        >
          {funnel.name}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-3 font-display text-[1.6rem] font-extrabold text-foreground text-center leading-tight"
        >
          {step.config.title}
        </motion.h1>
        {step.config.subtitle ? (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-3 text-sm text-muted-foreground text-center leading-relaxed"
          >
            {step.config.subtitle}
          </motion.p>
        ) : null}

        <motion.form
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          onSubmit={handleSubmit}
          className="mt-8 space-y-3"
        >
          <Input
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleBlur}
            placeholder="you@example.com"
          />
          <Button type="submit" disabled={submitting || !email.trim() || !!error}>
            {submitting ? "Saving…" : step.config.cta_label ?? "Continue"}
          </Button>
          {error ? (
            <p className="text-center text-sm text-destructive">{error}</p>
          ) : null}
        </motion.form>

        {step.config.consent_copy ? (
          <p className="mt-6 text-center text-xs text-muted-foreground leading-relaxed">
            {step.config.consent_copy}
          </p>
        ) : null}
      </div>
    </>
  );
}
