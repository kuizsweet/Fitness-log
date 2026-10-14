-- Persist only previews belonging to the signed-in user; not accepted workout data.
create table public.import_previews (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 filename text not null, file_hash text not null, source jsonb not null, created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '24 hours'
);
alter table public.import_previews enable row level security;
create policy preview_owner on public.import_previews for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
grant select,insert,delete on public.import_previews to authenticated;
revoke all on public.import_previews from anon;
