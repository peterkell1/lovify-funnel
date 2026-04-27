import { redirect } from "next/navigation";
import { env } from "@/lib/env";

export default function RootPage(): never {
  redirect(env.marketingUrl);
}
