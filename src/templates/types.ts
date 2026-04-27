import type { ComponentType, ReactNode } from "react";
import type { FunnelRow, FunnelStep, StepConfigByType, StepType } from "@/lib/funnel-types";
import type { StepProps } from "@/components/steps/types";

// Success step has different render needs than the others — it gets
// `email` and `landingEventId` resolved server-side rather than via the
// usual onNext / postAnswer flow. Templates supply a SuccessRenderer
// instead of putting success in the steps map.
export type SuccessProps = {
  step: FunnelStep<"success"> & { config: StepConfigByType["success"] };
  email: string | null;
  landingEventId: string | null;
};

export type SuccessRenderer = ComponentType<SuccessProps>;

// Optional chrome wrapper for the success page. Falls back to no-chrome
// if a template doesn't provide one (used by lovify-music-v1's PhoneFrame).
export type SuccessLayoutProps = {
  funnel: FunnelRow;
  children: ReactNode;
};
export type SuccessLayoutComponent = ComponentType<SuccessLayoutProps>;

// A template owns the entire visual + layout system for a funnel:
// chrome (phone frame, full-bleed shell, split-screen, …), per-step
// renderers, fonts, colors, breakpoint behavior. The funnel app and the
// admin preview both read from the same registry so what marketers see
// in the editor is exactly what end users see live.
//
// Marketers pick a template by id. Switching templates on a live funnel
// is safe — `step.config` shape is shared across templates; any field a
// template doesn't render is silently ignored.

export type TemplateLayoutProps = {
  funnel: FunnelRow;
  step: FunnelStep;
  stepIndex: number;
  totalSteps: number;
  // Whether the chrome should hide the progress bar (welcome/narrative/
  // crafting/paywall/success). Templates can interpret this however they
  // like — a desktop template might show a different progress affordance
  // entirely, or none.
  hideProgress: boolean;
  children: ReactNode;
};

// Renderers per step type. Not every template needs to support every
// step type identically, but all 12 keys must be present so SSR never
// renders a blank step. A template that wants to delegate (e.g. reuse
// the lovify-music-v1 implementation for one step) can re-export.
export type StepRenderers = {
  [K in StepType]: ComponentType<StepProps<K>>;
};

export type TemplateManifest = {
  id: string;
  name: string;
  description: string;
  // Optional thumbnail URL the admin "Pick a template" UI shows.
  thumbnailUrl?: string;
  // Documents the design intent. Templates always need to look right at
  // every viewport — this is just metadata for the admin.
  supportsViewports: ReadonlyArray<"mobile" | "desktop">;
};

export type Template = {
  manifest: TemplateManifest;
  Layout: ComponentType<TemplateLayoutProps>;
  steps: StepRenderers;
  // Optional dedicated renderer for the success page (different props
  // than the in-flow steps because email/landingEventId are resolved
  // server-side). Templates that don't supply this fall back to the
  // legacy v1 SuccessStep.
  Success?: SuccessRenderer;
  // Optional chrome around the success renderer. v1 uses a PhoneFrame;
  // template-2 uses no extra chrome. If undefined, the success page
  // renders the SuccessRenderer directly.
  SuccessLayout?: SuccessLayoutComponent;
};
