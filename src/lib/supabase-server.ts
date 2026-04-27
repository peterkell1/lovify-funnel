import { createClient } from "@supabase/supabase-js";
import { requireServerEnv } from "./env";

export const supabaseServiceRole = () => {
  const { supabaseUrl, supabaseServiceKey } = requireServerEnv();
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

// Back-compat alias — older code in the repo may still import `supabaseAdmin`.
export const supabaseAdmin = supabaseServiceRole;
