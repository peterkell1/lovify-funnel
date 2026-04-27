"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Cta({
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] md:static md:pt-6 md:pb-4 bg-gradient-to-t from-[var(--lt2-bg)] via-[var(--lt2-bg)] to-transparent">
      <div className="w-full max-w-sm mx-auto px-4 md:px-0">
        <button
          {...rest}
          className={cn(
            "lt2-cta w-full h-14 px-8 flex items-center justify-center gap-2 text-base",
            className,
          )}
        >
          {children}
        </button>
      </div>
    </div>
  );
}
