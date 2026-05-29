import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

export const supabase = env.useMockDb
  ? null
  : createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false }
    });
