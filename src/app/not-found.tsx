import Link from "next/link";
import { env } from "@/lib/env";

// 404 lives outside any funnel context (no slug, no template), so it
// uses neutral cream + dark styling that reads as on-brand without
// committing to either the v1 phone-frame look or template-2's
// full-bleed look. Inline styles avoid pulling either template's
// scoped CSS into a route that doesn't render through them.
export default function NotFound() {
  return (
    <main
      style={{
        background: "#faf6ef",
        color: "#1a1611",
        minHeight: "100vh",
        fontFamily:
          "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
        <p
          className="text-xs font-bold uppercase tracking-[0.3em]"
          style={{ color: "#7a6f60" }}
        >
          Lovify
        </p>
        <h1
          className="mt-5 text-4xl sm:text-5xl"
          style={{ fontWeight: 800, letterSpacing: "-0.012em", lineHeight: 1.05 }}
        >
          Page not found
        </h1>
        <p className="mt-4 text-base" style={{ color: "#7a6f60" }}>
          This funnel link may have expired or been paused.
        </p>
        <Link
          href={env.marketingUrl}
          className="mt-10 inline-flex h-14 items-center justify-center rounded-full px-10 text-base"
          style={{
            background: "#1f1813",
            color: "#ffffff",
            fontWeight: 700,
            boxShadow: "0 12px 28px -10px rgba(31, 24, 19, 0.45)",
          }}
        >
          Go to Lovify
        </Link>
      </div>
    </main>
  );
}
