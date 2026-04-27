import { cookies } from "next/headers";
import { readAttributionCookie, type AttributionPayload } from "./cookie-jwt";

export const ATTRIBUTION_COOKIE = "lfa";
export const SESSION_COOKIE = "lfs";

export const readAttribution = async (): Promise<AttributionPayload | null> => {
  const jar = cookies();
  const raw = jar.get(ATTRIBUTION_COOKIE)?.value;
  return readAttributionCookie(raw);
};

export const readSessionId = (): string | undefined => {
  return cookies().get(SESSION_COOKIE)?.value;
};
