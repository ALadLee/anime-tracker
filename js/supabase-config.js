// =========================================================
// Supabase configuration
// =========================================================
// Replace these two values with your own Supabase project's
// URL and public "anon" key. You can find both in your
// Supabase project dashboard under: Settings -> API
//
// The anon key is safe to expose in frontend code as long as
// Row Level Security (RLS) policies are set up correctly
// (see schema.sql in this project).
// =========================================================

const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

// Create a single shared Supabase client used across all pages.
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
