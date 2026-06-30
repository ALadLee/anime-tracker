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

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4Y3JqYWR5b3FkZmhxeWFreWpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MjUwMTgsImV4cCI6MjA5ODQwMTAxOH0.GV4SQ-kzAAkFQkAM-h4xOY5D6BdCz3JcZlIUYNq8BVQ";
const SUPABASE_URL = "https://ixcrjadyoqdfhqyakyjj.supabase.co";

// Create a single shared Supabase client used across all pages.
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
