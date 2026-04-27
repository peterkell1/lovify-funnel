import type { FunnelStep, StepType, StepConfigByType, FunnelRow } from "@/lib/funnel-types";
import type { PriorAnswers } from "@/lib/interpolate";

export type StepProps<T extends StepType> = {
  funnel: FunnelRow;
  step: FunnelStep<T> & { config: StepConfigByType[T] };
  sessionId: string | null;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  priorAnswers: PriorAnswers;
};
