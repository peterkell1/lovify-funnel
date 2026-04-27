import { createElement, type ComponentType } from "react";
import { CraftingStep } from "@/components/steps/CraftingStep";
import { EmailCaptureStep } from "@/components/steps/EmailCaptureStep";
import { GenrePickerStep } from "@/components/steps/GenrePickerStep";
import { NarrativeStep } from "@/components/steps/NarrativeStep";
import { NumberPickerStep } from "@/components/steps/NumberPickerStep";
import { PaywallStep } from "@/components/steps/PaywallStep";
import { QuizMultiStep } from "@/components/steps/QuizMultiStep";
import { QuizSingleStep } from "@/components/steps/QuizSingleStep";
import { StatementStep } from "@/components/steps/StatementStep";
import { TimePickerStep } from "@/components/steps/TimePickerStep";
import { WelcomeStep } from "@/components/steps/WelcomeStep";
import { SuccessStep } from "@/components/steps/SuccessStep";
import { PhoneFrame } from "@/components/ui/PhoneFrame";
import type { Template, TemplateManifest, SuccessLayoutComponent } from "@/templates/types";
import type { StepProps } from "@/components/steps/types";
import { Layout } from "./Layout";

// Success step has its own dedicated route at /[slug]/success and is
// never rendered through the template's step dispatcher. Provide a
// stub so the renderer map is exhaustive without bundling a real
// component here.
const SuccessStub: ComponentType<StepProps<"success">> = () => null;

const manifest: TemplateManifest = {
  id: "lovify-music-v1",
  name: "Lovify Music — v1",
  description:
    "Mobile-first phone frame, peach gradient, Montserrat. The original Lovify onboarding look.",
  // Mobile-only by design — the same phone frame renders on every
  // viewport. Future templates that paint a different desktop layout
  // declare ["mobile","desktop"].
  supportsViewports: ["mobile"],
};

// v1's success page wraps in a PhoneFrame to match the rest of the
// template's mobile-first chrome.
const SuccessLayout: SuccessLayoutComponent = ({ children }) =>
  createElement(PhoneFrame, null, children);

export const lovifyMusicV1: Template = {
  manifest,
  Layout,
  steps: {
    "email-capture": EmailCaptureStep,
    welcome: WelcomeStep,
    narrative: NarrativeStep,
    "quiz-single": QuizSingleStep,
    "quiz-multi": QuizMultiStep,
    "number-picker": NumberPickerStep,
    "time-picker": TimePickerStep,
    statement: StatementStep,
    "genre-picker": GenrePickerStep,
    crafting: CraftingStep,
    paywall: PaywallStep,
    success: SuccessStub,
  },
  Success: SuccessStep,
  SuccessLayout,
};
