-- Check-ins are private by default. Only an explicit opt-in shares an alias and streak.
create table public.daily_checkins (
 user_id uuid not null references auth.users(id) on delete cascade,
 checkin_date date not null,
 created_at timestamptz not null default now(),
 primary key(user_id,checkin_date)
);
create table public.checkin_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 listed boolean not null default false,
 display_name text not null default '' check(length(display_name)<=40),
 check(not listed or length(btrim(display_name))>0)
);
alter table public.daily_checkins enable row level security;
alter table public.checkin_preferences enable row level security;
create policy checkins_owner_read on public.daily_checkins for select to authenticated
 using ((select auth.uid())=user_id);
create policy checkin_preferences_owner on public.checkin_preferences for all to authenticated
 using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
revoke all on public.daily_checkins,public.checkin_preferences from public,anon,authenticated;
grant select on public.daily_checkins to authenticated;
grant select,insert,update on public.checkin_preferences to authenticated;

create schema if not exists fitness_journal_meta;
revoke all on schema fitness_journal_meta from public,anon,authenticated;
-- A bad timezone written via REST must not prevent other users from viewing the board.
create function fitness_journal_meta.checkin_timezone(p_user uuid) returns text
 language sql stable set search_path='' as $$
 select coalesce((select p.timezone from public.profiles p
 where p.user_id=p_user and exists(select 1 from pg_catalog.pg_timezone_names z where z.name=p.timezone)), 'Asia/Shanghai')
$$;
create function fitness_journal_meta.checkin_streak(p_user uuid,p_today date) returns integer
 language sql stable set search_path='' as $$
 with latest as (
  select max(checkin_date) as day from public.daily_checkins where user_id=p_user and checkin_date<=p_today
 ), ordered as (
  select checkin_date,row_number() over(order by checkin_date desc)::integer as n
  from public.daily_checkins
  where user_id=p_user and checkin_date<=(select day from latest)
   and (select day from latest)>=p_today-1
 )
 select count(*)::integer from ordered where checkin_date=(select day from latest)-(n-1)
$$;
revoke all on function fitness_journal_meta.checkin_timezone(uuid),fitness_journal_meta.checkin_streak(uuid,date)
 from public,anon,authenticated;

create function public.checkin_dashboard() returns jsonb language plpgsql stable
 security definer set search_path='' as $$
declare uid uuid=auth.uid(); tz text; day date; pref public.checkin_preferences; board jsonb;
begin
 if uid is null then raise exception '请先登录' using errcode='42501'; end if;
 tz=fitness_journal_meta.checkin_timezone(uid);
 day=(now() at time zone tz)::date;
 select * into pref from public.checkin_preferences where user_id=uid;
 with participants as (
  select p.user_id,p.display_name,fitness_journal_meta.checkin_streak(p.user_id,
   (now() at time zone fitness_journal_meta.checkin_timezone(p.user_id))::date) as streak
  from public.checkin_preferences p where p.listed
 ), ranked as (
  select rank() over(order by streak desc) as rank,display_name,streak,user_id
  from participants where streak>0
 ), top_rows as (
  select * from ranked order by rank,display_name,user_id limit 50
 )
 select coalesce(jsonb_agg(jsonb_build_object('rank',rank,'display_name',display_name,
  'streak',streak,'is_self',user_id=uid) order by rank,display_name,user_id),'[]'::jsonb) into board from top_rows;
 return jsonb_build_object('date',day,'timezone',tz,
  'checked_in',exists(select 1 from public.daily_checkins where user_id=uid and checkin_date=day),
  'streak',fitness_journal_meta.checkin_streak(uid,day),'listed',coalesce(pref.listed,false),
  'display_name',coalesce(pref.display_name,''),'leaderboard',board);
end $$;
create function public.daily_checkin() returns jsonb language plpgsql
 security definer set search_path='' as $$
declare uid uuid=auth.uid(); day date;
begin
 if uid is null then raise exception '请先登录' using errcode='42501'; end if;
 day=(now() at time zone fitness_journal_meta.checkin_timezone(uid))::date;
 -- The client cannot choose a date or user, and retries never duplicate a check-in.
 insert into public.daily_checkins(user_id,checkin_date) values(uid,day) on conflict do nothing;
 return public.checkin_dashboard();
end $$;
revoke all on function public.checkin_dashboard(),public.daily_checkin() from public,anon,authenticated;
grant execute on function public.checkin_dashboard(),public.daily_checkin() to authenticated;
