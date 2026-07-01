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
  status text not null check (status in ('Watching', 'Finished', 'Dropped', 'Plan to Watch')),
  current_episode integer,
  image_url text,           -- cover art URL (auto-found or pasted manually)
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Speeds up "load my anime" queries
create index if not exists anime_user_id_idx on public.anime (user_id);

-- 2. Enable Row Level Security --------------------------------
alter table public.anime enable row level security;

-- 3. Policies ---------------------------------------------------
create policy "Users can view their own anime"
  on public.anime for select
  using (auth.uid() = user_id);

create policy "Users can insert their own anime"
  on public.anime for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own anime"
  on public.anime for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own anime"
  on public.anime for delete
  using (auth.uid() = user_id);

-- =========================================================
-- MIGRATION — run this block only if you already created
-- the table WITHOUT the image_url column (first schema).
-- Safe to skip if you are starting fresh.
-- =========================================================
-- alter table public.anime add column if not exists image_url text;

-- =========================================================
-- Done! Next steps:
-- 1. Authentication -> Providers -> Email sign-in enabled.
-- 2. Authentication -> Users -> Add up to 5 user accounts.
-- 3. Settings -> API -> copy Project URL + anon key into
--    js/supabase-config.js
-- =========================================================
