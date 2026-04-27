"use client";

import { useEffect } from "react";
import { trackPixel, type FunnelEvent } from "@/lib/pixel";

export function MetaPixelEvent({
  event,
  params,
  eventId,
}: {
  event: FunnelEvent;
  params?: Record<string, unknown>;
  eventId?: string;
}) {
  useEffect(() => {
    trackPixel(event, params, eventId);
    // Only fire once per mount. Params are typically static per step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
