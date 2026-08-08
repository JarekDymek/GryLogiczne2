-- Centralny katalog mentorów. Profile graczy, punkty i postęp nadal są lokalne.

create or replace function public.is_app_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_user_roles
    where user_id = auth.uid()
      and role = 'owner'::public.app_role
  );
$$;

revoke all on function public.is_app_owner() from public;
grant execute on function public.is_app_owner() to anon, authenticated;

create table if not exists public.mentor_catalog (
  id text primary key check (id ~ '^mentor-[a-z0-9][a-z0-9_-]{2,79}$'),
  name text not null check (char_length(name) between 1 and 60),
  display_name text not null check (char_length(display_name) between 1 and 80),
  description text check (description is null or char_length(description) <= 240),
  avatar_path text check (avatar_path is null or avatar_path like id || '/%'),
  enabled boolean not null default true,
  allowed_for_players boolean not null default true,
  published boolean not null default false,
  unlock_type text not null default 'always'
    check (unlock_type in ('always', 'wins', 'experience-level')),
  unlock_value integer not null default 0 check (unlock_value between 0 and 999),
  unlock_label text not null default 'Dostępny od początku'
    check (char_length(unlock_label) between 1 and 100),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mentor_reactions (
  id text primary key check (char_length(id) between 1 and 100),
  mentor_id text not null references public.mentor_catalog(id) on delete cascade,
  position smallint not null check (position between 0 and 99),
  label text not null check (char_length(label) between 1 and 60),
  title text not null check (char_length(title) between 1 and 80),
  subtitle text not null check (char_length(subtitle) between 1 and 220),
  category text not null check (category in (
    'success', 'record', 'level-up', 'motivation', 'warning', 'failure',
    'neutral', 'power', 'director', 'team-win'
  )),
  media_type text not null default 'image' check (media_type in (
    'sprite', 'image', 'animated-webp', 'webm', 'mp4'
  )),
  media_path text check (media_path is null or media_path like mentor_id || '/%'),
  sound_id text check (sound_id is null or char_length(sound_id) <= 80),
  effect_id text check (effect_id is null or char_length(effect_id) <= 80),
  enabled boolean not null default true,
  weight numeric(5,2) not null default 1 check (weight between 0.1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mentor_id, position)
);

create index if not exists mentor_catalog_public_idx
  on public.mentor_catalog (published, enabled, updated_at desc);
create index if not exists mentor_reactions_mentor_idx
  on public.mentor_reactions (mentor_id, position);

create or replace function public.set_mentor_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mentor_catalog_updated_at on public.mentor_catalog;
create trigger mentor_catalog_updated_at
before update on public.mentor_catalog
for each row execute function public.set_mentor_updated_at();

drop trigger if exists mentor_reactions_updated_at on public.mentor_reactions;
create trigger mentor_reactions_updated_at
before update on public.mentor_reactions
for each row execute function public.set_mentor_updated_at();

alter table public.mentor_catalog enable row level security;
alter table public.mentor_reactions enable row level security;

drop policy if exists "active mentors are public" on public.mentor_catalog;
create policy "active mentors are public"
on public.mentor_catalog for select
to anon, authenticated
using ((published and enabled) or public.is_app_owner());

drop policy if exists "owner inserts mentors" on public.mentor_catalog;
create policy "owner inserts mentors"
on public.mentor_catalog for insert
to authenticated
with check (public.is_app_owner() and created_by = auth.uid());

drop policy if exists "owner updates mentors" on public.mentor_catalog;
create policy "owner updates mentors"
on public.mentor_catalog for update
to authenticated
using (public.is_app_owner())
with check (public.is_app_owner());

drop policy if exists "owner deletes mentors" on public.mentor_catalog;
create policy "owner deletes mentors"
on public.mentor_catalog for delete
to authenticated
using (public.is_app_owner());

drop policy if exists "active mentor reactions are public" on public.mentor_reactions;
create policy "active mentor reactions are public"
on public.mentor_reactions for select
to anon, authenticated
using (
  public.is_app_owner()
  or exists (
    select 1 from public.mentor_catalog mentors
    where mentors.id = mentor_id
      and mentors.published
      and mentors.enabled
  )
);

drop policy if exists "owner inserts mentor reactions" on public.mentor_reactions;
create policy "owner inserts mentor reactions"
on public.mentor_reactions for insert
to authenticated
with check (public.is_app_owner());

drop policy if exists "owner updates mentor reactions" on public.mentor_reactions;
create policy "owner updates mentor reactions"
on public.mentor_reactions for update
to authenticated
using (public.is_app_owner())
with check (public.is_app_owner());

drop policy if exists "owner deletes mentor reactions" on public.mentor_reactions;
create policy "owner deletes mentor reactions"
on public.mentor_reactions for delete
to authenticated
using (public.is_app_owner());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mentor-media',
  'mentor-media',
  false,
  12582912,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "active mentor media are readable" on storage.objects;
create policy "active mentor media are readable"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'mentor-media'
  and (
    public.is_app_owner()
    or exists (
      select 1 from public.mentor_catalog mentors
      where mentors.id = (storage.foldername(name))[1]
        and mentors.published
        and mentors.enabled
    )
  )
);

drop policy if exists "owner inserts mentor media" on storage.objects;
create policy "owner inserts mentor media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'mentor-media' and public.is_app_owner());

drop policy if exists "owner updates mentor media" on storage.objects;
create policy "owner updates mentor media"
on storage.objects for update
to authenticated
using (bucket_id = 'mentor-media' and public.is_app_owner())
with check (bucket_id = 'mentor-media' and public.is_app_owner());

drop policy if exists "owner deletes mentor media" on storage.objects;
create policy "owner deletes mentor media"
on storage.objects for delete
to authenticated
using (bucket_id = 'mentor-media' and public.is_app_owner());

revoke all on public.mentor_catalog from anon, authenticated;
revoke all on public.mentor_reactions from anon, authenticated;
grant select on public.mentor_catalog, public.mentor_reactions to anon, authenticated;
grant insert, update, delete on public.mentor_catalog, public.mentor_reactions to authenticated;
