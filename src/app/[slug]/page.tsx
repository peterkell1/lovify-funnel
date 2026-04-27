import { notFound, redirect } from "next/navigation";
import { loadFunnel } from "@/lib/funnel-config";

type Props = { params: { slug: string } };

// Funnel root. Redirects straight to the first step (typically email capture).
// Users rarely land here via middleware, but make it a clean redirect in case
// someone shares the bare URL.
export default async function FunnelRoot({ params }: Props) {
  const loaded = await loadFunnel(params.slug);
  if (!loaded || loaded.steps.length === 0) notFound();
  redirect(`/${params.slug}/${loaded.steps[0].step_key}`);
}
