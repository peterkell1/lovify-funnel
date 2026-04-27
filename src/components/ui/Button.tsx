import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

// Primary CTA: matches lovifymusic's onboarding "Continue" button verbatim.
// h-14, rounded-2xl, orange-to-rose gradient, soft drop shadow,
// scale-on-hover/active, with a clear disabled state that drops both scale
// and shadow so users know when they can't continue.
export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "primary", ...rest }, ref) => {
    const base =
      "w-full h-14 text-base font-semibold rounded-2xl inline-flex items-center justify-center gap-2 transition-all duration-200 disabled:cursor-not-allowed";
    const styles =
      variant === "primary"
        ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:shadow-none disabled:scale-100"
        : "bg-transparent text-muted-foreground hover:text-foreground disabled:opacity-40";
    return <button ref={ref} className={cn(base, styles, className)} {...rest} />;
  },
);
Button.displayName = "Button";
