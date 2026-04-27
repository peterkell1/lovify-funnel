import { supabaseServiceRole } from "./supabase-server";
import type { PriorAnswers } from "./interpolate";

// Loads every answer this session has submitted so far, keyed by step_key.
// Called once per SSR step render — cheap (one indexed query). Safe to call
// with a null/missing session id (returns an empty object).
export async function loadPriorAnswers(
  sessionId: string | null,
): Promise<PriorAnswers> {
  if (!sessionId) return {};
  const supabase = supabaseServiceRole();
  const { data } = await supabase
    .from("funnel_answers")
    .select("step_key, answer")
    .eq("session_id", sessionId);
  const out: PriorAnswers = {};
  for (const row of data ?? []) {
    out[row.step_key as string] = (row.answer as Record<string, unknown>) ?? {};
  }
  return out;
}
