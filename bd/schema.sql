create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 120),
  created_at timestamptz not null default now()
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  contact text not null check (char_length(btrim(contact)) between 1 and 200),
  company text not null default '' check (char_length(company) <= 200),
  service text not null check (
    service in ('placement', 'video', 'analytics', 'complex', 'other')
  ),
  message text not null default '' check (char_length(message) <= 5000),
  consent_given boolean not null check (consent_given),
  consented_at timestamptz not null default now(),
  status text not null default 'new' check (
    status in ('new', 'in_progress', 'done', 'cancelled')
  ),
  created_at timestamptz not null default now()
);

create index if not exists requests_user_created_at_idx
  on public.requests (user_id, created_at desc);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 'Пользователь')
  );
  return new;
end;
$$;

revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.requests enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.requests from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;
grant select on table public.requests to authenticated;
grant insert (name, contact, company, service, message, consent_given)
  on table public.requests to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users can read their own requests" on public.requests;
create policy "Users can read their own requests"
  on public.requests for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own requests" on public.requests;
create policy "Users can create their own requests"
  on public.requests for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
