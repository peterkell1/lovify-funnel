import { SignJWT, jwtVerify } from "jose";

const getSecret = () => {
  const raw = process.env.ATTRIBUTION_COOKIE_SECRET;
  if (!raw) throw new Error("Missing env var: ATTRIBUTION_COOKIE_SECRET");
  return new TextEncoder().encode(raw);
};

export type AttributionPayload = {
  ttclid?: string;
  fbclid?: string;
  gclid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  firstSeenAt: number;
};

export const signAttributionCookie = async (
  payload: AttributionPayload,
): Promise<string> => {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
};

export const readAttributionCookie = async (
  token: string | undefined,
): Promise<AttributionPayload | null> => {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as AttributionPayload;
  } catch {
    return null;
  }
};
