"use client";

import { useState } from "react";
import { postAnswer } from "@/lib/client-api";
import { pickStepImage } from "@/lib/assets";
import { Cta } from "../Cta";
import { ImageCardCarousel } from "../ImageCardCarousel";
import type { StepProps } from "@/components/steps/types";

type WithImage = {
  value: string;
  label: string;
  image_asset_key?: string;
  character_image_url?: string;
};

export function WelcomeStep({ step, sessionId, onNext }: StepProps<"welcome">) {
  const [pending, setPending] = useState<string | null>(null);
  const heroImage = pickStepImage(step.config);
  const options = (step.config as { options?: WithImage[] }).options ?? [];
  const isPicker =
    (step.config as { layout?: string }).layout !== 'vertical' &&
    options.length >= 2 &&
    options.length <= 3;

  const submit = async (value: string | null) => {
    if (pending) return;
    setPending(value ?? "_");
    if (sessionId) {
      await postAnswer({
        sessionId,
        stepId: step.id,
        stepKey: step.step_key,
        answer: value ? { value } : { acknowledged: true },
      }).catch(() => {});
    }
    onNext();
  };

  if (isPicker) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-6 md:py-10 gap-8 md:gap-10">
        <div className="text-center max-w-2xl px-2">
          <h1 className="lt2-headline text-[2rem] md:text-5xl leading-[1.08]">
            {step.config.title}
          </h1>
          {step.config.subtitle ? (
            <p className="mt-3 text-base md:text-lg text-[var(--lt2-muted)]">
              {step.config.subtitle}
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
            disabled: !!pending,
            selected: pending === opt.value,
          }))}
          onSelect={submit}
        />

        {step.config.legal_note ? (
          <p className="text-center text-xs md:text-sm text-[var(--lt2-muted)] max-w-md px-4">
            {step.config.legal_note}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
        {step.config.hero_emoji && !heroImage ? (
          <div className="text-6xl">{step.config.hero_emoji}</div>
        ) : null}
        <h1 className="lt2-headline text-3xl md:text-5xl max-w-xl">
          {step.config.title}
        </h1>
        {step.config.subtitle ? (
          <p className="text-[var(--lt2-muted)] text-base md:text-lg max-w-md">
            {step.config.subtitle}
          </p>
        ) : null}
        {heroImage ? (
          <img
            src={heroImage}
            alt=""
            className="rounded-2xl w-full max-w-md max-h-[360px] object-cover"
          />
        ) : null}
      </div>
      <Cta onClick={() => submit(null)} disabled={!!pending}>
        {step.config.cta_label ?? "Continue"}
      </Cta>
    </>
  );
}
