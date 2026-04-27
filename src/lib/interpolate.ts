// Resolves {{answer.<step_key>}} tokens inside step copy (narrative screens
// often want to echo a number/choice from earlier in the funnel back to the
// user). Keeps the token surface tiny on purpose — no helpers, no filters.
// If a token has no matching answer the whole token is left intact so it's
// obvious in preview that nothing landed.

export type PriorAnswers = Record<string, Record<string, unknown>>;

const TOKEN_RE = /\{\{\s*answer\.([a-z0-9_-]+)\s*\}\}/gi;

export function interpolate(template: string, answers: PriorAnswers): string {
  if (!template) return template;
  return template.replace(TOKEN_RE, (match, stepKey: string) => {
    const ans = answers[stepKey];
    if (!ans) return match;
    if (typeof ans.value !== "undefined") return String(ans.value);
    if (Array.isArray(ans.values)) return ans.values.join(", ");
    if (typeof ans.time === "string") return ans.time;
    return match;
  });
}
