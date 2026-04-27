import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Mobile-first shell used by every step. Matches lovifymusic's onboarding
// pattern: full dynamic viewport height, safe-area padding for notches, and
// a max-w-lg content column centered on desktop.
//
// The children are expected to be a ProgressBar (optional) + the step
// body. Both live inside the same flex-col so the step body can scroll
// independently while the header stays visible.
export function PhoneFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-[100dvh] bg-gradient-warm flex flex-col safe-top safe-bottom relative overflow-hidden",
        className,
      )}
    >
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-6 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
