import { type ComponentType } from "react";
import type { Template, TemplateManifest } from "@/templates/types";
import type { StepProps } from "@/components/steps/types";
import { Layout } from "./Layout";
import { SuccessLayout } from "./SuccessLayout";
import { WelcomeStep } from "./steps/WelcomeStep";
import { EmailCaptureStep } from "./steps/EmailCaptureStep";
import { QuizSingleStep } from "./steps/QuizSingleStep";
import { QuizMultiStep } from "./steps/QuizMultiStep";
import { NumberPickerStep } from "./steps/NumberPickerStep";
import { TimePickerStep } from "./steps/TimePickerStep";
import { NarrativeStep } from "./steps/NarrativeStep";
import { StatementStep } from "./steps/StatementStep";
import { CraftingStep } from "./steps/CraftingStep";
import { GenrePickerStep } from "./steps/GenrePickerStep";
import { PaywallStep } from "./steps/PaywallStep";
import { SuccessStep } from "./steps/SuccessStep";

// Stub for the in-flow steps map. The real success renderer is exposed
// via Template.Success and consumed by the dedicated /success route.
const SuccessStub: ComponentType<StepProps<"success">> = () => null;

const manifest: TemplateManifest = {
  id: "lovify-template-2",
  name: "Lovify — v2",
  description:
    "Full-bleed responsive shell, cream + dark, 3-up plan cards. Designed for desktop and mobile from the same template.",
  supportsViewports: ["mobile", "desktop"],
};

export const lovifyTemplate2: Template = {
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
