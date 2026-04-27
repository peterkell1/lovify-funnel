"use client";

import { useState } from "react";
import { HiCheck } from "react-icons/hi2";
import { postAnswer } from "@/lib/client-api";
import { interpolate } from "@/lib/interpolate";
import { pickStepImage } from "@/lib/assets";
import { ImageCardCarousel } from "../ImageCardCarousel";
import type { StepProps } from "@/components/steps/types";

type OptionWithImage = {
  value: string;
  label: string;
  emoji?: string;
  image_asset_key?: string;
  character_image_url?: string;
};

export function QuizSingleStep({
  step,
  sessionId,
  onNext,
  priorAnswers,
}: StepProps<"quiz-single">) {
  const seeded =
    (priorAnswers[step.step_key] as { value?: string } | undefined)?.value ?? null;
  const [selected, setSelected] = useState<string | null>(seeded);
  const [submitting, setSubmitting] = useState(false);
  const title = interpolate(step.config.title, priorAnswers);
  const subtitle = step.config.subtitle
    ? interpolate(step.config.subtitle, priorAnswers)
    : null;

  const options = (step.config.options ?? []) as OptionWithImage[];

  // Image-card layout for horizontal 2-3 option steps (e.g. gender picker).
  // Vertical layout always uses the standard text-row list regardless of count.
  const isImagePicker =
    step.config.layout !== 'vertical' &&
    options.length >= 2 &&
    options.length <= 3;

  const submit = async (value: string) => {
    if (submitting) return;
    setSelected(value);
    setSubmitting(true);
    if (sessionId) {
      await postAnswer({
        sessionId,
        stepId: step.id,
        stepKey: step.step_key,
        answer: { value },
      }).catch(() => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[quiz-single] postAnswer failed for step", step.step_key);
        }
      });
    }
    onNext();
  };

  // ── Image-card picker (e.g. gender step with Male/Female photos) ──
  if (isImagePicker) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-6 md:py-10 gap-8 md:gap-10">
        <div className="text-center max-w-2xl px-2">
          <h1 className="lt2-headline text-[2rem] md:text-5xl leading-[1.08]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 text-base md:text-lg text-[var(--lt2-muted)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        <ImageCardCarousel
          options={options.map((opt) => ({
            value: opt.value,
            label: opt.label,
            imageUrl: pickStepImage({
              image_asset_key: opt.image_asset_key,
              character_image_url: opt.character_image_url,
            }) ?? null,
            disabled: submitting,
            selected: selected === opt.value,
          }))}
          onSelect={submit}
        />
      </div>
    );
  }

  // ── Standard text-row list ──
  return (
    <>
      <div className="text-center pt-4 md:pt-8">
        <h1 className="lt2-headline text-2xl md:text-[2rem] max-w-2xl mx-auto leading-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 text-[var(--lt2-muted)] text-sm md:text-base">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="lt2-stagger flex-1 flex flex-col justify-start pt-6 md:pt-8 w-full gap-2.5">
        {options.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              data-selected={isSelected}
              onClick={() => submit(opt.value)}
              className="lt2-row w-full px-4 py-[14px] flex items-center justify-between gap-3 text-left"
            >
              <span className="flex items-center gap-3 min-w-0">
                {opt.emoji ? (
                  <span className="text-xl flex-shrink-0 w-7 inline-flex items-center justify-center">
                    {opt.emoji}
                  </span>
                ) : null}
                <span className="font-medium text-base text-[var(--lt2-fg)]">
                  {opt.label}
                </span>
              </span>
              <span className="lt2-radio" data-checked={isSelected}>
                {isSelected ? <HiCheck className="h-3.5 w-3.5" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
