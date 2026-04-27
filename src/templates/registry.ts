import type { Template, TemplateManifest } from "./types";
import { lovifyMusicV1 } from "./lovify-music-v1";
import { lovifyTemplate2 } from "./lovify-template-2";

// Source of truth for funnel-rendering templates. To add a template
// later: build a `<id>/` folder with the same `Template` shape, import
// it here, append to TEMPLATES. Nothing else in the funnel app should
// need to change — `StepRouter` and SSR are template-agnostic.
export const TEMPLATES: Template[] = [lovifyMusicV1, lovifyTemplate2];

export const DEFAULT_TEMPLATE_ID = lovifyMusicV1.manifest.id;

const TEMPLATES_BY_ID: Record<string, Template> = Object.fromEntries(
  TEMPLATES.map((t) => [t.manifest.id, t]),
);

// Always returns a template — falls back to the default if the id is
// unknown or null. Funnels in the DB may have a stale template id from
// a deprecated template; we'd rather render the default than 500.
export function getTemplate(id: string | null | undefined): Template {
  if (id && TEMPLATES_BY_ID[id]) return TEMPLATES_BY_ID[id];
  return TEMPLATES_BY_ID[DEFAULT_TEMPLATE_ID];
}

export function listTemplateManifests(): TemplateManifest[] {
  return TEMPLATES.map((t) => t.manifest);
}
