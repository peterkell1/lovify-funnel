import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-2xl border-2 border-foreground/15 bg-card px-5 py-4 text-[15px] font-medium text-foreground shadow-soft outline-none transition placeholder:text-muted-foreground focus:border-orange-400 focus:ring-2 focus:ring-orange-400/30",
        className,
      )}
      {...rest}
    />
  ),
);
Input.displayName = "Input";
