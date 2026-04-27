import { unstable_cache, revalidateTag } from "next/cache";
import { supabaseServiceRole } from "./supabase-server";
import type { FunnelRow, FunnelStep, LoadedFunnel } from "./funnel-types";

// Ad pages are cheap reads and status changes (pause/publish) are
// high-stakes: a paused funnel serving ad traffic wastes money. Keep
// TTL short so cache-bust failures are a ~60s inconvenience, not a
// 5-minute billing disaster.
const CACHE_TTL_SECONDS = 60;

export const funnelCacheTag = (slug: string) => `funnel:${slug}`;

const loadFunnelUncached = async (slug: string): Promise<LoadedFunnel | null> => {
  const sb = supabaseServiceRole();
  const { data: funnel } = await sb
    .from("funnels")
    .select(
      "id, slug, name, description, status, template, theme, meta_pixel_id, default_plan_key, most_popular_plan_key, default_interval, plan_options",
    )
    .eq("slug", slug)
    .eq("status", "live")
    .maybeSingle();
  if (!funnel) return null;

  const { data: steps } = await sb
    .from("funnel_steps")
    .select("id, funnel_id, step_key, step_type, position, config")
    .eq("funnel_id", (funnel as FunnelRow).id)
    .order("position");

  return {
    funnel: funnel as FunnelRow,
    steps: (steps ?? []) as FunnelStep[],
  };
};

export const loadFunnel = (slug: string): Promise<LoadedFunnel | null> =>
  unstable_cache(
    () => loadFunnelUncached(slug),
    ["funnel", slug],
    { tags: [funnelCacheTag(slug)], revalidate: CACHE_TTL_SECONDS },
  )();

export const bustFunnelCache = (slug: string) => {
  revalidateTag(funnelCacheTag(slug));
};

export const findStepByKey = (
  loaded: LoadedFunnel,
  stepKey: string,
): FunnelStep | undefined => loaded.steps.find((s) => s.step_key === stepKey);

export const getNextStepKey = (
  loaded: LoadedFunnel,
  currentStepKey: string,
): string | null => {
  const i = loaded.steps.findIndex((s) => s.step_key === currentStepKey);
  if (i < 0 || i >= loaded.steps.length - 1) return null;
  return loaded.steps[i + 1].step_key;
};
