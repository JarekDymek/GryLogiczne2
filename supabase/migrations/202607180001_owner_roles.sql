create type public.app_role as enum ('player', 'educator', 'admin', 'owner');

create table public.app_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'player',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_user_roles enable row level security;
revoke all on table public.app_user_roles from anon, authenticated;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.app_user_roles where user_id = auth.uid()),
    'player'::public.app_role
  );
$$;

revoke all on function public.current_app_role() from public, anon;
grant execute on function public.current_app_role() to authenticated;

-- Nadaj rolę wyłącznie z SQL Editor lub przez klucz service_role:
-- insert into public.app_user_roles (user_id, role)
-- values ('UUID-KONTA-WŁAŚCICIELA', 'owner')
-- on conflict (user_id) do update set role = excluded.role, updated_at = now();

