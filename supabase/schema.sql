-- Pranata Database Schema
-- Run this in your Supabase SQL Editor

-- 1. Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  user_id uuid references auth.users on delete cascade unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  display_name text,
  avatar_url text,
  timezone_setting text default 'auto'
);

-- 2. Create schedules table
create table if not exists public.schedules (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  date date,
  time text,
  type text not null check (type in ('general', 'work', 'study', 'workout', 'work_departure')),
  location text,
  notes text,
  work_start_time text,
  travel_duration_minutes integer,
  traffic_buffer_minutes integer,
  calculated_departure_time text,
  is_done boolean default false,
  is_recurring boolean default false,
  recurring_days integer[] default null,
  reminder_minutes integer default null,
  start_date date default null,
  end_date date default null,
  completed_dates text[] default null,
  exception_dates text[] default null
);

-- 3. Create tasks table
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  description text,
  due_date date,
  priority text not null check (priority in ('low', 'medium', 'high')),
  status text not null check (status in ('pending', 'in_progress', 'done')),
  start_time text,
  end_time text
);

-- 4. Create notes table
create table if not exists public.notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  content text,
  category text
);

-- 5. Create resources table
create table if not exists public.resources (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  url text,
  category text,
  notes text
);

-- 6. Create transactions table
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  amount numeric not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  date date not null
);

-- Enable Row Level Security (RLS) on all tables (safe to rerun)
alter table public.profiles enable row level security;
alter table public.schedules enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;
alter table public.resources enable row level security;
alter table public.transactions enable row level security;

-- Drop existing policies first to prevent "policy already exists" errors
drop policy if exists "Users can manage their own profile." on public.profiles;
drop policy if exists "Users can manage their own schedules." on public.schedules;
drop policy if exists "Users can manage their own tasks." on public.tasks;
drop policy if exists "Users can manage their own notes." on public.notes;
drop policy if exists "Users can manage their own resources." on public.resources;
drop policy if exists "Users can manage their own transactions." on public.transactions;

-- Create Policies for RLS
create policy "Users can manage their own profile." on public.profiles
  for all using (auth.uid() = user_id);

create policy "Users can manage their own schedules." on public.schedules
  for all using (auth.uid() = user_id);

create policy "Users can manage their own tasks." on public.tasks
  for all using (auth.uid() = user_id);

create policy "Users can manage their own notes." on public.notes
  for all using (auth.uid() = user_id);

create policy "Users can manage their own resources." on public.resources
  for all using (auth.uid() = user_id);

create policy "Users can manage their own transactions." on public.transactions
  for all using (auth.uid() = user_id);

-- Setup automatic updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Drop existing triggers to avoid duplication
drop trigger if exists set_profiles_updated_at on public.profiles;
drop trigger if exists set_schedules_updated_at on public.schedules;
drop trigger if exists set_tasks_updated_at on public.tasks;
drop trigger if exists set_notes_updated_at on public.notes;
drop trigger if exists set_resources_updated_at on public.resources;
drop trigger if exists set_transactions_updated_at on public.transactions;

-- Apply updated_at trigger to all tables
create trigger set_profiles_updated_at before update on public.profiles for each row execute procedure public.handle_updated_at();
create trigger set_schedules_updated_at before update on public.schedules for each row execute procedure public.handle_updated_at();
create trigger set_tasks_updated_at before update on public.tasks for each row execute procedure public.handle_updated_at();
create trigger set_notes_updated_at before update on public.notes for each row execute procedure public.handle_updated_at();
create trigger set_resources_updated_at before update on public.resources for each row execute procedure public.handle_updated_at();
create trigger set_transactions_updated_at before update on public.transactions for each row execute procedure public.handle_updated_at();

-- Automatically create profile row when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, user_id, display_name)
  values (new.id, new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger on auth.users if exists
drop trigger if exists on_auth_user_created on auth.users;

-- Recreate trigger on auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.handle_session_limit()
returns trigger as $$
begin
  delete from auth.sessions
  where user_id = new.user_id
  and id not in (
    select id
    from auth.sessions
    where user_id = new.user_id
    order by created_at desc
    limit 5
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists limit_user_sessions on auth.sessions;

create trigger limit_user_sessions
  after insert on auth.sessions
  for each row execute procedure public.handle_session_limit();

-- Migration queries for updating existing databases to this schema version:
--
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone_setting text DEFAULT 'auto';
--
-- ALTER TABLE public.schedules 
--   ADD COLUMN IF NOT EXISTS start_date date DEFAULT null,
--   ADD COLUMN IF NOT EXISTS end_date date DEFAULT null,
--   ADD COLUMN IF NOT EXISTS completed_dates text[] DEFAULT null,
--   ADD COLUMN IF NOT EXISTS exception_dates text[] DEFAULT null,
--   ALTER COLUMN date DROP NOT NULL;
--
-- ALTER TABLE public.tasks 
--   ADD COLUMN IF NOT EXISTS start_time text DEFAULT null,
--   ADD COLUMN IF NOT EXISTS end_time text DEFAULT null;
