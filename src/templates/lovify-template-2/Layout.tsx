"use client";

import { useEffect, useRef, useState } from "react";
import { HiArrowLeft } from "react-icons/hi2";
import { useRouter } from "next/navigation";
import type { TemplateLayoutProps } from "@/templates/types";
import "./theme.css";

export function Layout({
  funnel,
  step: _step,
  stepIndex,
  totalSteps,
  hideProgress,
  children,
}: TemplateLayoutProps) {
  const router = useRouter();
  const targetPct =
    !hideProgress && totalSteps > 0
      ? Math.round(((stepIndex + 1) / totalSteps) * 100)
      : 0;

  // Animate from previous step's percentage to current on every page mount.
  // Start at 0 (or previous stored value), then rAF to target so the CSS
  // transition fires even though the element just mounted.
  const [pct, setPct] = useState(0);
  const prevPctRef = useRef(0);
  useEffect(() => {
    // Start from where we were before this page loaded
    setPct(prevPctRef.current);
    const id = requestAnimationFrame(() => {
      setPct(targetPct);
      prevPctRef.current = targetPct;
    });
    return () => cancelAnimationFrame(id);
  }, [targetPct]);
  const brandName =
    (funnel.theme as { brandName?: string } | null | undefined)?.brandName ??
    "Lovify";

  return (
    <div className="lt2-root h-[100dvh] md:min-h-screen flex flex-col overflow-y-auto">
      {/* Header: brand wordmark centered, back arrow left, spacer right */}
      <header className="flex-shrink-0 border-b border-[var(--lt2-border)]">
        <div className="w-full max-w-7xl mx-auto px-5 md:px-10 h-14 flex items-center gap-3">
          {stepIndex > 0 ? (
            <button
              type="button"
              aria-label="Back"
              onClick={() => router.back()}
              className="lt2-icon-btn h-9 w-9 inline-flex items-center justify-center rounded-full border border-[var(--lt2-border)] hover:bg-[var(--lt2-card)] transition flex-shrink-0"
            >
              <HiArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <span className="h-9 w-9 flex-shrink-0" aria-hidden="true" />
          )}
          <div className="flex-1 flex items-center justify-center gap-2">
            <img
              src="/lovify-logo.png"
              alt=""
              className="h-7 w-7 object-contain select-none flex-shrink-0"
              draggable={false}
            />
            <span
              className="lt2-headline select-none"
              style={{ fontSize: 19, letterSpacing: "-0.03em", lineHeight: 1 }}
            >
              {brandName}
            </span>
          </div>
          {/* Mirror-width spacer keeps wordmark visually centered */}
          <span className="h-9 w-9 flex-shrink-0" aria-hidden="true" />
        </div>
        {/* Progress bar sits flush at the bottom of the header */}
        {!hideProgress && (
          <div className="lt2-progress-track rounded-none">
            <div
              className="lt2-progress-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </header>

      {/* Main: fills remaining viewport height so steps can justify-center */}
      <main className="flex-1 flex flex-col md:justify-center">
        <div className="lt2-page-enter w-full max-w-3xl mx-auto px-5 md:px-10 pt-8 pb-0 md:py-12 flex-1 md:flex-none flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
