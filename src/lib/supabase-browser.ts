import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export const supabaseBrowser = () =>
  createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false },
  });
