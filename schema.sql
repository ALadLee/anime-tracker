-- =========================================================
-- Anime Tracker — Supabase database schema
-- =========================================================
-- Run this in your Supabase project's SQL Editor:
-- Dashboard -> SQL Editor -> New query -> paste -> Run
-- =========================================================

-- 1. Create the "anime" table -------------------------------
create table if not exists public.anime (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  season integer,
  status text not null check (status in ('Watching', 'Finished', 'Plan to Watch')),
  current_episode integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Speeds up "load my anime" queries
create index if not exists anime_user_id_idx on public.anime (user_id);

-- 2. Enable Row Level Security --------------------------------
-- This is what guarantees each user can only ever see and
-- modify their OWN rows, even though everyone shares one table.
alter table public.anime enable row level security;

-- 3. Policies ---------------------------------------------------
-- Allow users to read only their own anime
create policy "Users can view their own anime"
  on public.anime for select
  using (auth.uid() = user_id);

-- Allow users to insert anime tied to their own account
create policy "Users can insert their own anime"
  on public.anime for insert
  with check (auth.uid() = user_id);

-- Allow users to update only their own anime
create policy "Users can update their own anime"
  on public.anime for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow users to delete only their own anime
create policy "Users can delete their own anime"
  on public.anime for delete
  using (auth.uid() = user_id);

-- =========================================================
-- Done! Next steps:
-- 1. Go to Authentication -> Providers and make sure
--    "Email" sign-in is enabled.
-- 2. Go to Authentication -> Users and manually create up to
--    5 user accounts (one per person in your group), OR
--    temporarily enable sign-ups and have each person create
--    their own account, then disable sign-ups again.
-- 3. Copy your Project URL and anon public key from
--    Settings -> API into js/supabase-config.js
-- =========================================================
