// Resolve a step-config `image_asset_key` value to a real `<img src>`.
//
// Convention: keys are paths relative to `public/funnel-assets/`, e.g.
// `wellness/sunset-portrait.jpg`. The funnel app serves /funnel-assets
// statically (Next.js public folder), so the resolved URL is just the
// key prefixed with /funnel-assets/.
//
// We resolve at render time rather than storing the URL in step config
// so renaming/moving an asset only needs the file move + a manifest
// bump — funnel rows don't have to be patched.
export function resolveAssetUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  // Strip leading slashes and any accidental "funnel-assets/" prefix.
  const trimmed = key.replace(/^\/+/, "").replace(/^funnel-assets\//, "");
  return `/funnel-assets/${trimmed}`;
}

// Pick the right image source for a step that supports both the legacy
// free-form URL field and the new asset-key field. New assets win when
// both are set so admins migrating to the picker get the new behaviour
// without us having to nullify their old URL.
export function pickStepImage(config: {
  image_asset_key?: string | null;
  character_image_url?: string | null;
}): string | null {
  return resolveAssetUrl(config.image_asset_key) ?? config.character_image_url ?? null;
}
