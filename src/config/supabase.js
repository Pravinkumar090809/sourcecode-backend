import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("   SUPABASE_URL:", supabaseUrl ? "✅ set" : "❌ missing");
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", supabaseKey ? "✅ set" : "❌ missing");
  console.error("   Set these in Render Dashboard → Environment Variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default supabase;
