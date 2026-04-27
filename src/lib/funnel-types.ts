export type StepType =
  | "email-capture"
  | "welcome"
  | "narrative"
  | "quiz-single"
  | "quiz-multi"
  | "number-picker"
  | "time-picker"
  | "statement"
  | "genre-picker"
  | "crafting"
  | "paywall"
  | "success";

export type PlanOption = {
  planKey: string;
  stripePriceId: string;
  label: string;
  trialDays: number;
  amountCents: number;
  credits?: number;
  interval?: "month" | "quarter" | "year";
};

export type FunnelRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: "draft" | "live" | "paused";
  template: string | null;
  theme: Record<string, unknown>;
  meta_pixel_id: string | null;
  default_plan_key: string | null;
  // Drives the "MOST POPULAR" ribbon in templates that surface it
  // (lovify-template-2). Templates that don't render a ribbon ignore
  // this field. Falls back to default_plan_key at render time.
  most_popular_plan_key: string | null;
  default_interval: "trial" | "year" | "month" | "quarter" | null;
  plan_options: PlanOption[];
};

export type QuizOption = { value: string; label: string; emoji?: string };

export type StepConfigByType = {
  "email-capture": {
    title: string;
    subtitle?: string;
    cta_label?: string;
    consent_copy?: string;
    privacy_url?: string;
    terms_url?: string;
  };
  welcome: {
    title: string;
    subtitle?: string;
    cta_label?: string;
    body_md?: string;
    hero_emoji?: string;
    character_image_url?: string;
    image_asset_key?: string;
    // Shown below the image cards (picker mode) — e.g. ToS / Privacy note
    legal_note?: string;
  };
  narrative: {
    title: string;
    subtitle?: string;
    cta_label?: string;
    character_image_url?: string;
    image_asset_key?: string;
    hero_emoji?: string;
    bullets?: { emoji?: string; text: string }[];
    footer_note?: string;
  };
  "quiz-single": {
    title: string;
    subtitle?: string;
    cta_label?: string;
    options: QuizOption[];
    required: boolean;
    layout: "vertical" | "horizontal";
  };
  "quiz-multi": {
    title: string;
    subtitle?: string;
    cta_label?: string;
    options: QuizOption[];
    min: number;
    max: number;
  };
  "number-picker": {
    title: string;
    subtitle?: string;
    cta_label?: string;
    min: number;
    max: number;
    default: number;
    unit_label: string;
    step: number;
  };
  "time-picker": {
    title: string;
    subtitle?: string;
    cta_label?: string;
    default_hour: number;
    default_minute: number;
    default_period: "AM" | "PM";
    minute_step: number;
  };
  statement: {
    title: string;
    // The quote / statement card itself. Optional in Likert mode where
    // the title alone carries the question.
    statement?: string;
    required: boolean;
    cta_label?: string;
    // Optional Likert configuration. When set, the step renders a
    // 1..max numeric scale instead of Yes/No, with min/max anchor
    // labels under the ends. Both modes write `answer.value` so the
    // webhook profile-projection logic doesn't care which mode ran.
    scale?: {
      max: number;
      min_label?: string;
      max_label?: string;
    };
  };
  "genre-picker": {
    title: string;
    subtitle?: string;
    cta_label?: string;
    genres: QuizOption[];
    min: number;
    max: number;
  };
  crafting: {
    title: string;
    subtitle?: string;
    duration_ms: number;
    messages: string[];
  };
  paywall: {
    title: string;
    subtitle?: string;
    plan_keys: string[];
    default_plan_key: string;
    features: string[];
    trial_copy?: string;
    guarantee_copy?: string;
  };
  success: {
    title: string;
    headline: string;
    body_md: string;
    app_store_url: string;
    play_store_url: string;
    show_set_password_cta: boolean;
  };
};

export type FunnelStep<T extends StepType = StepType> = {
  id: string;
  funnel_id: string;
  step_key: string;
  step_type: T;
  position: number;
  config: StepConfigByType[T];
};

export type LoadedFunnel = {
  funnel: FunnelRow;
  steps: FunnelStep[];
};
