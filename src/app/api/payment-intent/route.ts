import { NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { supabaseServiceRole } from "@/lib/supabase-server";
import type { PlanOption } from "@/lib/funnel-types";

export const runtime = "nodejs";

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  planKey: z.string().min(1),
});

// Flatten attribution into a shallow string-string map so Stripe metadata
// (which requires string values, max 500 chars) accepts it.
const flattenForStripe = (
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    const key = `${prefix}${k}`.slice(0, 40);
    out[key] = String(v).slice(0, 480);
  }
  return out;
};

export async function POST(req: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const sb = supabaseServiceRole();

  const { data: session, error: sessionErr } = await sb
    .from("funnel_sessions")
    .select("id, funnel_id, email, attribution, landing_event_id, status")
    .eq("id", body.sessionId)
    .maybeSingle();
  if (sessionErr || !session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }
  const sess = session as {
    id: string;
    funnel_id: string;
    email: string | null;
    attribution: Record<string, unknown>;
    landing_event_id: string;
    status: string;
  };
  // Session already converted? Don't let the user create another
  // subscription — send them to the success page instead. This handles
  // the "user reloaded the paywall after paying" + "user came back to
  // the funnel URL with a stale cookie" cases without double-charging.
  if (sess.status === "converted") {
    return NextResponse.json({ alreadyConverted: true });
  }
  if (sess.status !== "active") {
    return NextResponse.json({ error: "session_closed" }, { status: 410 });
  }
  if (!sess.email) {
    return NextResponse.json({ error: "email_required" }, { status: 400 });
  }

  const { data: funnel } = await sb
    .from("funnels")
    .select("id, slug, plan_options")
    .eq("id", sess.funnel_id)
    .maybeSingle();
  if (!funnel) {
    return NextResponse.json({ error: "funnel_not_found" }, { status: 404 });
  }
  const planOptions = ((funnel as { plan_options: PlanOption[] }).plan_options ?? []);
  const plan = planOptions.find((p) => p.planKey === body.planKey);
  if (!plan) {
    return NextResponse.json({ error: "unknown_plan" }, { status: 400 });
  }

  const s = stripe();

  // Reuse the customer if we already created one for this session.
  let customerId: string | null = null;
  const { data: sessWithCustomer } = await sb
    .from("funnel_sessions")
    .select("stripe_customer_id")
    .eq("id", sess.id)
    .maybeSingle();
  if (sessWithCustomer) {
    customerId =
      (sessWithCustomer as { stripe_customer_id: string | null }).stripe_customer_id ?? null;
  }

  if (!customerId) {
    const customer = await s.customers.create({
      email: sess.email,
      metadata: {
        funnel_session_id: sess.id,
        funnel_slug: (funnel as { slug: string }).slug,
      },
    });
    customerId = customer.id;
  }

  const metadata: Record<string, string> = {
    funnel_session_id: sess.id,
    funnel_slug: (funnel as { slug: string }).slug,
    plan_key: plan.planKey,
    landing_event_id: sess.landing_event_id,
    ...flattenForStripe(sess.attribution ?? {}, "attr_"),
  };

  const subscription = await s.subscriptions.create({
    customer: customerId,
    items: [{ price: plan.stripePriceId }],
    trial_period_days: plan.trialDays > 0 ? plan.trialDays : undefined,
    payment_behavior: "default_incomplete",
    payment_settings: {
      // Lock the attached payment method surface to cards. Matches the
      // PaymentElement config on the client and stops Stripe from auto-
      // enabling Link / Amazon Pay / Cash App / Klarna based on the
      // dashboard defaults.
      payment_method_types: ["card"],
      save_default_payment_method: "on_subscription",
    },
    expand: ["pending_setup_intent", "latest_invoice.confirmation_secret"],
    metadata,
  });

  await sb
    .from("funnel_sessions")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan_key: plan.planKey,
    })
    .eq("id", sess.id);

  // Trial: PaymentElement collects the card via SetupIntent (no charge today).
  if (plan.trialDays > 0) {
    const setup = subscription.pending_setup_intent;
    if (!setup || typeof setup === "string" || !setup.client_secret) {
      return NextResponse.json(
        { error: "missing_setup_intent" },
        { status: 500 },
      );
    }
    return NextResponse.json({
      type: "setup",
      clientSecret: setup.client_secret,
      subscriptionId: subscription.id,
    });
  }

  // Immediate-charge: PaymentElement collects via the invoice's PaymentIntent.
  // Stripe SDK v22 exposes this as invoice.confirmation_secret.client_secret.
  const invoice = subscription.latest_invoice;
  if (!invoice || typeof invoice === "string") {
    return NextResponse.json({ error: "missing_invoice" }, { status: 500 });
  }
  const confirmSecret = invoice.confirmation_secret?.client_secret;
  if (!confirmSecret) {
    return NextResponse.json({ error: "missing_payment_intent" }, { status: 500 });
  }
  return NextResponse.json({
    type: "payment",
    clientSecret: confirmSecret,
    subscriptionId: subscription.id,
  });
}
