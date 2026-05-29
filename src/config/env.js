import dotenv from "dotenv";

dotenv.config();

const hasSupabaseConfig =
  Boolean(process.env.SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export const env = {
  port: Number(process.env.PORT || 4000),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  useMockDb: process.env.USE_MOCK_DB === "true" || !hasSupabaseConfig,
  apiKey: process.env.API_KEY || ""
};
