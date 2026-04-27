import { env } from "./env";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export type FunnelEvent =
  | "ViewContent"
  | "Lead"
  | "InitiateCheckout"
  | "AddPaymentInfo"
  | "Purchase"
  | "CompleteRegistration";

export const trackPixel = (
  event: FunnelEvent,
  params?: Record<string, unknown>,
  eventId?: string,
) => {
  if (typeof window === "undefined") return;
  if (!env.metaPixelId) return;
  const opts = eventId ? { eventID: eventId } : undefined;
  window.fbq?.("track", event, params ?? {}, opts);
};

// Legacy alias — older callsites used `track`.
export const track = trackPixel;

export const getFbp = (): string | undefined => {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(?:^|;\s*)_fbp=([^;]+)/);
  return match?.[1];
};

export const getFbc = (): string | undefined => {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(?:^|;\s*)_fbc=([^;]+)/);
  return match?.[1];
};
