import type { SuccessLayoutProps } from "@/templates/types";
import "./theme.css";

// Wraps the template-2 success page with .lt2-root so all CSS variables
// resolve correctly. No header or progress bar — the success screen
// intentionally de-chromes and just shows the confirmation.
export function SuccessLayout({ children }: SuccessLayoutProps) {
  return (
    <div className="lt2-root min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col">
        <div className="w-full max-w-5xl mx-auto px-5 md:px-10 py-8 md:py-14 flex-1 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
