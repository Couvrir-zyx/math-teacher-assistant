create table if not exists public.workbench_state (
  id text not null default 'primary',
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null default '{"version":1,"students":[],"lessons":[],"summaries":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (id, user_id),
  unique (user_id)
);

alter table public.workbench_state enable row level security;

create policy "read own workbench state"
on public.workbench_state for select
using (auth.uid() = user_id);

create policy "insert own workbench state"
on public.workbench_state for insert
with check (auth.uid() = user_id);

create policy "update own workbench state"
on public.workbench_state for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.touch_workbench_state()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workbench_state_touch
before update on public.workbench_state
for each row execute function public.touch_workbench_state();
