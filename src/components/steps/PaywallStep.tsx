"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/Button";
import { createPaymentIntent, postAnswer } from "@/lib/client-api";
import { env } from "@/lib/env";
import { formatAmount } from "@/lib/plans";
import { cn } from "@/lib/cn";
import { trackPixel, getFbp, getFbc } from "@/lib/pixel";
import type { StepProps } from "./types";
import type { PlanOption } from "@/lib/funnel-types";

let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(env.stripePublishableKey);
  }
  return stripePromise;
};

type IntentResult = { type: "setup" | "payment"; clientSecret: string };

// "trial" is a virtual interval — we surface trial-bearing plans on their
// own tab even though they're technically yearly plans under the hood.
type IntervalKey = "trial" | "year" | "quarter" | "month";

const INTERVAL_ORDER: IntervalKey[] = ["trial", "year", "quarter", "month"];
const INTERVAL_LABEL: Record<IntervalKey, string> = {
  trial: "Free trial",
  year: "Annual",
  quarter: "Quarterly",
  month: "Monthly",
};

const intervalOf = (plan: PlanOption): IntervalKey =>
  plan.trialDays && plan.trialDays > 0
    ? "trial"
    : (plan.interval ?? "year");

// Paywall lets the end user pick interval + credit tier themselves — the
// two dropdowns mirror lovifymusic's MembershipSheet. Admin decides which
// plans are enabled (funnel.plan_options), the default interval, and the
// default plan. User just accepts or tweaks.
export function PaywallStep({ funnel, step, sessionId }: StepProps<"paywall">) {
  const router = useRouter();
  // Resolve which plans are live on this paywall. If the step config lists
  // plan_keys, use that subset. Otherwise show the whole funnel catalog.
  const allPlans = funnel.plan_options;
  const enabledPlans: PlanOption[] = useMemo(() => {
    if (step.config.plan_keys && step.config.plan_keys.length > 0) {
      return step.config.plan_keys
        .map((k) => allPlans.find((p) => p.planKey === k))
        .filter((p): p is PlanOption => Boolean(p));
    }
    return allPlans;
  }, [allPlans, step.config.plan_keys]);

  // Group plans by interval for the credit-tier dropdown.
  const plansByInterval = useMemo(() => {
    const map = new Map<IntervalKey, PlanOption[]>();
    for (const p of enabledPlans) {
      const k = intervalOf(p);
      const arr = map.get(k) ?? [];
      arr.push(p);
      map.set(k, arr);
    }
    return map;
  }, [enabledPlans]);

  const availableIntervals = INTERVAL_ORDER.filter((k) =>
    (plansByInterval.get(k) ?? []).length > 0,
  );

  // Work out the initial interval + plan.
  const adminDefaultPlan = enabledPlans.find(
    (p) =>
      p.planKey ===
      (step.config.default_plan_key ?? funnel.default_plan_key ?? ""),
  );
  const adminDefaultInterval =
    (funnel.default_interval as IntervalKey | null) ?? null;
  const initialInterval: IntervalKey =
    (adminDefaultInterval && availableIntervals.includes(adminDefaultInterval)
      ? adminDefaultInterval
      : null) ??
    (adminDefaultPlan ? intervalOf(adminDefaultPlan) : null) ??
    availableIntervals[0] ??
    "trial";

  const initialPlan: PlanOption | undefined =
    adminDefaultPlan && intervalOf(adminDefaultPlan) === initialInterval
      ? adminDefaultPlan
      : (plansByInterval.get(initialInterval) ?? [])[0];

  const [interval, setInterval] = useState<IntervalKey>(initialInterval);
  const [planKey, setPlanKey] = useState<string>(initialPlan?.planKey ?? "");
  const [intent, setIntent] = useState<IntentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    trackPixel("InitiateCheckout", { content_name: "paywall" });
  }, []);

  // Keep planKey valid when interval changes.
  const currentIntervalPlans = plansByInterval.get(interval) ?? [];
  const selectedPlan =
    currentIntervalPlans.find((p) => p.planKey === planKey) ??
    currentIntervalPlans[0];

  useEffect(() => {
    if (selectedPlan && selectedPlan.planKey !== planKey) {
      setPlanKey(selectedPlan.planKey);
    }
  }, [selectedPlan, planKey]);

  const handleIntervalChange = (next: IntervalKey) => {
    setInterval(next);
    const first = plansByInterval.get(next)?.[0];
    if (first) setPlanKey(first.planKey);
  };

  const handleContinue = async () => {
    if (!sessionId) {
      setErr("Missing session. Refresh and start again.");
      return;
    }
    if (!selectedPlan) {
      setErr("No plan selected.");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      // Recording the plan_key as a funnel_answer is best-effort — the
      // authoritative source is Stripe metadata on the subscription,
      // which createPaymentIntent sets below. If the session is already
      // closed (e.g. the user converted then retried a different plan)
      // or any other hiccup happens, don't block checkout on it.
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
      // Session already has a paid subscription — don't let the user
      // create a second one. Send them to the success page where they
      // can set their password and download the app.
      if ("alreadyConverted" in result) {
        router.push(`/${funnel.slug}/success`);
        return;
      }
      setIntent({ type: result.type, clientSecret: result.clientSecret });
      trackPixel("AddPaymentInfo", { plan_key: selectedPlan.planKey });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-[1.6rem] font-extrabold text-foreground text-center leading-tight pt-6"
      >
        {step.config.title}
      </motion.h1>
      {step.config.subtitle ? (
        <p className="text-sm text-muted-foreground text-center mt-2 leading-relaxed">
          {step.config.subtitle}
        </p>
      ) : null}

      {!intent ? (
        <>
          {/* Interval tabs */}
          {availableIntervals.length > 1 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-5 inline-flex self-center gap-1 rounded-full bg-foreground/5 p-1"
            >
              {availableIntervals.map((k) => {
                const active = interval === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleIntervalChange(k)}
                    className={cn(
                      "px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all",
                      active
                        ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {INTERVAL_LABEL[k]}
                  </button>
                );
              })}
            </motion.div>
          ) : null}

          {/* Credit-tier dropdown */}
          {currentIntervalPlans.length > 1 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4"
            >
              <label className="block">
                <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">
                  Choose your credit pack
                </span>
                <div className="mt-1.5 relative">
                  <select
                    value={planKey}
                    onChange={(e) => setPlanKey(e.target.value)}
                    className="w-full appearance-none rounded-xl border-2 border-border/60 bg-card/80 px-4 py-3 pr-10 text-sm font-semibold text-foreground focus:border-orange-400 focus:outline-none"
                  >
                    {currentIntervalPlans.map((p) => (
                      <option key={p.planKey} value={p.planKey}>
                        {formatPlanOption(p)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </label>
            </motion.div>
          ) : null}

          {/* Selected plan summary card */}
          {selectedPlan ? (
            <motion.div
              key={selectedPlan.planKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-2xl border-2 border-orange-400 bg-orange-500/10 px-5 py-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="font-display font-bold text-foreground">
                    {selectedPlan.label}
                  </p>
                  {selectedPlan.credits ? (
                    <p className="mt-1 text-[13px] text-foreground/70 font-medium">
                      {selectedPlan.credits.toLocaleString()} credits
                      {selectedPlan.interval === "year"
                        ? "/year"
                        : selectedPlan.interval === "quarter"
                          ? "/3mo"
                          : selectedPlan.interval === "month"
                            ? "/month"
                            : ""}
                    </p>
                  ) : null}
                  {selectedPlan.trialDays > 0 ? (
                    <p className="mt-1 text-[13px] text-orange-500 font-semibold">
                      {selectedPlan.trialDays}-day free trial · cancel anytime
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  <div className="text-xl font-extrabold text-foreground">
                    {formatAmount(selectedPlan.amountCents)}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {selectedPlan.interval === "year"
                      ? "per year"
                      : selectedPlan.interval === "quarter"
                        ? "per 3 months"
                        : selectedPlan.interval === "month"
                          ? "per month"
                          : ""}
                  </p>
                </div>
              </div>
            </motion.div>
          ) : null}

          {/* Features */}
          {step.config.features.length > 0 ? (
            <motion.ul
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-5 space-y-2"
            >
              {step.config.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-sm text-foreground/80"
                >
                  <Check className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </motion.ul>
          ) : null}

          {err ? (
            <p className="mt-4 text-sm text-destructive text-center">{err}</p>
          ) : null}

          <div className="mt-auto pt-6 pb-4">
            <Button onClick={handleContinue} disabled={loading || !selectedPlan}>
              {loading
                ? "Preparing…"
                : selectedPlan?.trialDays
                  ? "Start my free trial"
                  : "Continue to payment"}
              {!loading ? <ArrowRight className="w-5 h-5" /> : null}
            </Button>

            {step.config.guarantee_copy ? (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {step.config.guarantee_copy}
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <Elements
          stripe={getStripe()}
          options={{
            clientSecret: intent.clientSecret,
            appearance: {
              theme: "stripe",
              variables: {
                colorPrimary: "#f97316",
                colorBackground: "#ffffff",
                colorText: "#272422",
                colorDanger: "#e53935",
                fontFamily:
                  'Montserrat, system-ui, -apple-system, Segoe UI, sans-serif',
                borderRadius: "12px",
              },
            },
            loader: "auto",
          }}
        >
          <PaymentForm
            funnel={funnel.slug}
            type={intent.type}
            planKey={planKey}
            plan={selectedPlan ?? null}
            onCancel={() => {
              setIntent(null);
              setLoading(false);
            }}
          />
        </Elements>
      )}
    </>
  );
}

// Dropdown option label — "9,000 credits — $89.99/yr" for annual, etc.
function formatPlanOption(p: PlanOption): string {
  const price = formatAmount(p.amountCents);
  const credits = p.credits ? `${p.credits.toLocaleString()} credits` : p.label;
  const suffix =
    p.interval === "year"
      ? "/yr"
      : p.interval === "quarter"
        ? "/3mo"
        : p.interval === "month"
          ? "/mo"
          : "";
  return `${credits} — ${price}${suffix}`;
}

function PaymentForm({
  funnel,
  type,
  planKey,
  plan,
  onCancel,
}: {
  funnel: string;
  type: "setup" | "payment";
  planKey: string;
  plan: PlanOption | null;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !ready || submitting) return;
    setSubmitting(true);
    setErr(null);
    const returnUrl = `${window.location.origin}/${funnel}/success?plan=${planKey}&fbp=${encodeURIComponent(getFbp() ?? "")}&fbc=${encodeURIComponent(getFbc() ?? "")}`;

    const result =
      type === "setup"
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
      setSubmitting(false);
    }
    // On success Stripe redirects to returnUrl; nothing to do here.
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="mt-6 flex flex-col flex-1"
    >
      {/* Order summary — keeps "what am I paying for?" visible while the
          user fills in card details. Matches the plan card on the
          previous screen so the hand-off feels continuous. */}
      {plan ? (
        <div className="mb-4 rounded-2xl border border-orange-400/40 bg-orange-500/5 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-500">
                {plan.trialDays > 0 ? "Today you pay" : "Order summary"}
              </p>
              <p className="mt-0.5 font-display font-bold text-foreground truncate">
                {plan.label}
              </p>
              {plan.credits ? (
                <p className="text-[12px] text-foreground/70 font-medium">
                  {plan.credits.toLocaleString()} credits
                  {plan.interval === "year"
                    ? "/year"
                    : plan.interval === "quarter"
                      ? "/3mo"
                      : plan.interval === "month"
                        ? "/month"
                        : ""}
                </p>
              ) : null}
            </div>
            <div className="text-right flex-shrink-0">
              {plan.trialDays > 0 ? (
                <>
                  <p className="text-lg font-extrabold text-foreground">$0.00</p>
                  <p className="text-[11px] text-muted-foreground">
                    then {formatAmount(plan.amountCents)}/
                    {plan.interval === "year"
                      ? "yr"
                      : plan.interval === "quarter"
                        ? "3mo"
                        : "mo"}{" "}
                    after {plan.trialDays} days
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-extrabold text-foreground">
                    {formatAmount(plan.amountCents)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {plan.interval === "year"
                      ? "per year"
                      : plan.interval === "quarter"
                        ? "per 3 months"
                        : plan.interval === "month"
                          ? "per month"
                          : ""}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="bg-card/80 rounded-2xl border border-border/50 p-4 backdrop-blur-sm">
        <PaymentElement
          onReady={() => setReady(true)}
          options={{
            layout: "accordion",
            paymentMethodOrder: ["card"],
            terms: {
              card: "never",
            },
          }}
        />
      </div>
      {err ? (
        <p className="mt-3 text-sm text-destructive text-center">{err}</p>
      ) : null}

      <div className="mt-auto pt-6 pb-4 space-y-2">
        <Button type="submit" disabled={!stripe || !ready || submitting}>
          {!ready ? "Loading…" : submitting ? "Processing…" : "Confirm"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={submitting}
        >
          Change plan
        </Button>
      </div>
    </motion.form>
  );
}
