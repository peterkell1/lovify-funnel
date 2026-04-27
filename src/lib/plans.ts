import type { PlanOption } from "./funnel-types";

export const findPlan = (
  planOptions: PlanOption[],
  planKey: string,
): PlanOption | undefined =>
  planOptions.find((p) => p.planKey === planKey);

export const planIsTrial = (plan: PlanOption): boolean => plan.trialDays > 0;

export const formatAmount = (cents: number, currency = "USD"): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
