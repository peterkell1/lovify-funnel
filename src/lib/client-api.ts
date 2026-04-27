export type AnswerPayload = {
  sessionId: string;
  stepId: string;
  stepKey: string;
  answer: Record<string, unknown>;
};

export async function postAnswer(payload: AnswerPayload): Promise<void> {
  const res = await fetch("/api/answers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`answers_write_failed_${res.status}`);
}

export type CreatePaymentIntentResult =
  | { type: "setup"; clientSecret: string; subscriptionId: string }
  | { type: "payment"; clientSecret: string; subscriptionId: string }
  | { alreadyConverted: true };

export async function createPaymentIntent(params: {
  sessionId: string;
  planKey: string;
}): Promise<CreatePaymentIntentResult> {
  const res = await fetch("/api/payment-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`payment_intent_failed_${res.status}_${body}`);
  }
  return res.json();
}
