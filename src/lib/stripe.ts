import Stripe from "stripe";
import { requireServerEnv } from "./env";

let _stripe: Stripe | null = null;

export const stripe = () => {
  if (_stripe) return _stripe;
  const { stripeSecretKey } = requireServerEnv();
  _stripe = new Stripe(stripeSecretKey);
  return _stripe;
};
