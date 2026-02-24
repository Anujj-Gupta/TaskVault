-- ============================================================
-- TaskVault — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension (already enabled by default in Supabase)
create extension if not exists "uuid-ossp";

-- ── Tasks table ────────────────────────────────────────────
create table public.tasks (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  description  text,
  link         text,
  due_at       timestamptz,
  remind_at    timestamptz,
  recurrence   text check (recurrence in ('daily','weekly','monthly')),
  category     text not null default 'work'
                 check (category in ('work','personal','health','learning','finance','other')),
  priority     text not null default 'medium'
                 check (priority in ('low','medium','high')),
  done         boolean not null default false,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── Logs table ─────────────────────────────────────────────
create table public.logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  task_id     uuid references public.tasks(id) on delete set null,
  task_title  text not null,
  type        text not null check (type in (
                'created','completed','reopened','deleted',
                'reminded','snoozed','email_sent','updated'
              )),
  message     text not null,
  created_at  timestamptz not null default now()
);

-- ── Indexes ────────────────────────────────────────────────
create index tasks_user_id_idx     on public.tasks(user_id);
create index tasks_remind_at_idx   on public.tasks(remind_at) where done = false;
create index tasks_due_at_idx      on public.tasks(due_at);
create index logs_user_id_idx      on public.logs(user_id);
create index logs_task_id_idx      on public.logs(task_id);
create index logs_created_at_idx   on public.logs(created_at desc);

-- ── Row Level Security ─────────────────────────────────────
alter table public.tasks enable row level security;
alter table public.logs  enable row level security;

-- Tasks: users can only see/edit their own
create policy "tasks: user owns" on public.tasks
  for all using (auth.uid() = user_id);

-- Logs: users can only see their own
create policy "logs: user owns" on public.logs
  for all using (auth.uid() = user_id);

-- ── Auto-update updated_at trigger ────────────────────────
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.handle_updated_at();
