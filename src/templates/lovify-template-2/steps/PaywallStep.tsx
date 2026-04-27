"use client";

import { useMemo, useState } from "react";
import { HiCheck } from "react-icons/hi2";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";
import { createPaymentIntent, postAnswer } from "@/lib/client-api";
import { env } from "@/lib/env";
import { formatAmount } from "@/lib/plans";
import { cn } from "@/lib/cn";
import type { StepProps } from "@/components/steps/types";
import type { PlanOption } from "@/lib/funnel-types";

let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = () => {
  if (!stripePromise) stripePromise = loadStripe(env.stripePublishableKey);
  return stripePromise;
};

type IntentResult = { type: "setup" | "payment"; clientSecret: string };

// lovify-template-2 paywall.
//
// Visual model: 3-up cards on desktop, stacked on mobile. The
// `most_popular_plan_key` (or default_plan_key when null) gets a ribbon
// + slightly elevated styling. Selecting a card highlights it; the
// single CTA below confirms and mounts Stripe.
export function PaywallStep({ funnel, step, sessionId }: StepProps<"paywall">) {
  const router = useRouter();
  const allPlans = funnel.plan_options;
  const enabledPlans: PlanOption[] = useMemo(() => {
    if (step.config.plan_keys && step.config.plan_keys.length > 0) {
      return step.config.plan_keys
        .map((k) => allPlans.find((p) => p.planKey === k))
        .filter((p): p is PlanOption => Boolean(p));
    }
    return allPlans;
  }, [allPlans, step.config.plan_keys]);

  const popularKey = funnel.most_popular_plan_key ?? funnel.default_plan_key;
  const initialKey =
    funnel.default_plan_key && enabledPlans.some((p) => p.planKey === funnel.default_plan_key)
      ? funnel.default_plan_key
      : enabledPlans[0]?.planKey ?? null;

  const [planKey, setPlanKey] = useState<string | null>(initialKey);
  const [intent, setIntent] = useState<IntentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selectedPlan = enabledPlans.find((p) => p.planKey === planKey) ?? null;

  // Features and CTA label update based on the selected plan.
  const planFeatures: string[] = useMemo(() => {
    if (!selectedPlan) return step.config.features ?? [];
    const lines: string[] = [];
    if (selectedPlan.trialDays && selectedPlan.trialDays > 0) {
      lines.push(`${selectedPlan.trialDays}-day free trial`);
    }
    if (selectedPlan.credits) {
      const interval = selectedPlan.interval ?? "year";
      lines.push(`${selectedPlan.credits.toLocaleString()} credits/${interval}`);
    }
    if (selectedPlan.trialDays && selectedPlan.trialDays > 0) {
      lines.push("Cancel anytime during trial");
    }
    return lines.length > 0 ? lines : (step.config.features ?? []);
  }, [selectedPlan, step.config.features]);

  const ctaLabel = loading
    ? "Loading…"
    : selectedPlan?.trialDays
      ? "Start my free trial"
      : "Continue to payment";

  const handleContinue = async () => {
    if (!sessionId) {
      setErr("Missing session. Refresh and start again.");
      return;
    }
    if (!selectedPlan) {
      setErr("Pick a plan to continue.");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      await postAnswer({
        sessionId,
        stepId: step.id,
        stepKey: step.step_key,
        answer: { plan_key: selectedPlan.planKey },
      }).catch(() => {});
      const result = await createPaymentIntent({
        sessionId,
        planKey: selectedPlan.planKey,
      });
      if ("alreadyConverted" in result) {
        router.push(`/${funnel.slug}/success`);
        return;
      }
      setIntent({ type: result.type, clientSecret: result.clientSecret });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  };

  if (intent) {
    return (
      <Elements
        stripe={getStripe()}
        options={{
          clientSecret: intent.clientSecret,
          appearance: { theme: "stripe" },
        }}
      >
        <Checkout funnelSlug={funnel.slug} mode={intent.type} plan={selectedPlan} />
      </Elements>
    );
  }

  const PlanCard = ({ p, mobile }: { p: PlanOption; mobile: boolean }) => {
    const isSelected = p.planKey === planKey;
    const isPopular = p.planKey === popularKey;
    if (mobile) {
      return (
        <button
          key={p.planKey}
          type="button"
          onClick={() => setPlanKey(p.planKey)}
          className={cn(
            "relative text-left rounded-2xl border bg-[var(--lt2-card)] px-4 py-4 flex items-center justify-between gap-4 transition",
            isSelected
              ? "border-[var(--lt2-fg)] shadow-[0_0_0_1px_var(--lt2-fg)]"
              : "border-[var(--lt2-border)]",
          )}
        >
          {isPopular ? (
            <span className="absolute -top-3 left-4 bg-[var(--lt2-cta-bg)] text-[var(--lt2-cta-fg)] text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full whitespace-nowrap">
              Most popular
            </span>
          ) : null}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="lt2-radio shrink-0" data-checked={isSelected} aria-hidden="true">
              {isSelected ? (
                <span className="block h-2.5 w-2.5 rounded-full bg-[var(--lt2-bg)]" />
              ) : null}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="lt2-headline text-base leading-tight">{p.label}</h3>
              {p.credits ? (
                <div className="text-xs text-[var(--lt2-muted)] mt-0.5">
                  {p.credits.toLocaleString()} credits
                </div>
              ) : null}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="lt2-headline text-xl">{formatAmount(p.amountCents)}</div>
            <div className="text-[10px] text-[var(--lt2-muted)]">
              {p.trialDays && p.trialDays > 0
                ? `then /${p.interval ?? "year"}`
                : `per ${p.interval ?? "year"}`}
            </div>
          </div>
        </button>
      );
    }
    return (
      <button
        key={p.planKey}
        type="button"
        onClick={() => setPlanKey(p.planKey)}
        className={cn(
          "relative text-left rounded-2xl border bg-[var(--lt2-card)] p-6 flex flex-col gap-3 transition",
          isSelected
            ? "border-[var(--lt2-fg)] shadow-[0_0_0_1px_var(--lt2-fg)]"
            : "border-[var(--lt2-border)] hover:border-[var(--lt2-muted)]",
        )}
      >
        {isPopular ? (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--lt2-cta-bg)] text-[var(--lt2-cta-fg)] text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full whitespace-nowrap">
            Most popular
          </span>
        ) : null}
        <div className="flex items-start justify-between gap-2">
          <h3 className="lt2-headline text-xl leading-tight">{p.label}</h3>
          <span className="lt2-radio mt-1 shrink-0" data-checked={isSelected} aria-hidden="true">
            {isSelected ? (
              <span className="block h-2.5 w-2.5 rounded-full bg-[var(--lt2-bg)]" />
            ) : null}
          </span>
        </div>
        <div>
          <div className="lt2-headline text-3xl">{formatAmount(p.amountCents)}</div>
          <div className="text-xs text-[var(--lt2-muted)]">
            {p.trialDays && p.trialDays > 0
              ? `${p.trialDays}-day free trial, then ${formatAmount(p.amountCents)}/${p.interval ?? "year"}`
              : `Per ${p.interval ?? "year"}`}
          </div>
        </div>
        {p.credits ? (
          <div className="text-xs text-[var(--lt2-muted)]">
            {p.credits.toLocaleString()} credits
          </div>
        ) : null}
      </button>
    );
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-6 md:py-10 w-full">
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-0">
        <div className="text-center pt-2 md:pt-0 w-full">
          <h1 className="lt2-headline text-3xl md:text-4xl max-w-2xl mx-auto">
            {step.config.title}
          </h1>
          {step.config.subtitle ? (
            <p className="mt-3 text-[var(--lt2-muted)] max-w-xl mx-auto">
              {step.config.subtitle}
            </p>
          ) : null}
        </div>

        {/* Mobile: stacked rows */}
        <div className="mt-8 md:hidden flex flex-col gap-3 w-full max-w-2xl">
          {enabledPlans.map((p) => <PlanCard key={p.planKey} p={p} mobile />)}
        </div>

        {/* Desktop: grid cards — 3-col for 3 plans, 2-col for 2, auto otherwise */}
        <div
          className={cn(
            "mt-10 hidden md:grid gap-5 w-full",
            enabledPlans.length === 2 ? "grid-cols-2 max-w-2xl" :
            enabledPlans.length === 3 ? "grid-cols-3 max-w-4xl" :
            enabledPlans.length === 4 ? "grid-cols-4 max-w-5xl" :
            "grid-cols-3 max-w-4xl",
          )}
        >
          {enabledPlans.map((p) => <PlanCard key={p.planKey} p={p} mobile={false} />)}
        </div>

        {/* Features — update when plan changes */}
        {planFeatures.length > 0 ? (
          <ul className="mt-8 w-full max-w-2xl flex flex-col gap-2 text-sm md:text-base">
            {planFeatures.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <HiCheck className="h-4 w-4 mt-1 text-[var(--lt2-accent)] flex-shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {err ? (
          <p className="mt-4 text-sm text-rose-600 text-center">{err}</p>
        ) : null}

        <div className="mt-8 w-full max-w-2xl sticky bottom-0 bg-gradient-to-t from-[var(--lt2-bg)] via-[var(--lt2-bg)] to-transparent pt-6 pb-4">
          <button
            type="button"
            onClick={handleContinue}
            disabled={loading || !selectedPlan}
            className="lt2-cta w-full h-14 px-8 flex items-center justify-center gap-2 text-base"
          >
            {ctaLabel}
          </button>
          {step.config.guarantee_copy ? (
            <p className="mt-3 text-center text-xs text-[var(--lt2-muted)]">
              {step.config.guarantee_copy}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Checkout({
  funnelSlug,
  mode,
  plan,
}: {
  funnelSlug: string;
  mode: "setup" | "payment";
  plan: PlanOption | null;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!stripe || !elements || busy || !plan) return;
    setBusy(true);
    setErr(null);
    const returnUrl = `${window.location.origin}/${funnelSlug}/success?plan=${plan.planKey}`;
    const result =
      mode === "setup"
        ? await stripe.confirmSetup({
            elements,
            confirmParams: { return_url: returnUrl },
          })
        : await stripe.confirmPayment({
            elements,
            confirmParams: { return_url: returnUrl },
          });
    if (result.error) {
      setErr(result.error.message ?? "Payment failed");
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-5 max-w-lg mx-auto w-full pt-2 md:pt-8">
      <div>
        <h2 className="lt2-headline text-2xl md:text-3xl">Complete your checkout</h2>
        {plan ? (
          <div className="mt-4 lt2-card p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{plan.label}</div>
              <div className="text-xs text-[var(--lt2-muted)]">
                {plan.trialDays && plan.trialDays > 0
                  ? `Today you pay ${formatAmount(0)} — then ${formatAmount(plan.amountCents)} after ${plan.trialDays} days`
                  : `${formatAmount(plan.amountCents)} per ${plan.interval ?? "year"}`}
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <div className="lt2-card p-4 md:p-5">
        <PaymentElement />
      </div>
      {err ? <p className="text-sm text-rose-600">{err}</p> : null}
      <button
        type="button"
        onClick={submit}
        disabled={busy || !stripe}
        className="lt2-cta h-14 inline-flex items-center justify-center gap-2 text-base"
      >
        {busy ? "Processing…" : "Continue"}
      </button>
    </div>
  );
}
