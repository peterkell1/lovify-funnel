const required = (name: string, value: string | undefined): string => {
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
};

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "",
  metaCapiToken: process.env.META_CAPI_TOKEN ?? process.env.META_CAPI_ACCESS_TOKEN ?? "",
  authUrl: process.env.NEXT_PUBLIC_AUTH_URL ?? "https://auth.trylovify.com",
  appStoreUrl:
    process.env.NEXT_PUBLIC_APP_STORE_URL ?? "https://apps.apple.com/app/lovify",
  playStoreUrl:
    process.env.NEXT_PUBLIC_PLAY_STORE_URL ??
    "https://play.google.com/store/apps/details?id=com.lovify",
  marketingUrl:
    process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://trylovify.com",
  attributionCookieSecret: process.env.ATTRIBUTION_COOKIE_SECRET ?? "",
  funnelRevalidateSecret: process.env.FUNNEL_REVALIDATE_SECRET ?? "",
  // Comma-separated list of origins allowed to call /api/revalidate
  // cross-origin (the admin panel). Defaults cover local dev.
  funnelAdminOrigins: (
    process.env.FUNNEL_ADMIN_ORIGINS ??
    "http://localhost:5173,http://localhost:8080"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};

export const requireServerEnv = () => ({
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", env.supabaseUrl),
  supabaseServiceKey: required(
    "SUPABASE_SERVICE_ROLE_KEY",
    env.supabaseServiceKey,
  ),
  stripeSecretKey: required("STRIPE_SECRET_KEY", env.stripeSecretKey),
  attributionCookieSecret: required(
    "ATTRIBUTION_COOKIE_SECRET",
    env.attributionCookieSecret,
  ),
});
