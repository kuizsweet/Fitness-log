-- Generated from checked-in migrations. Never reset or drop existing data.
begin;
select pg_advisory_xact_lock(hashtext('fitness_journal_schema'));
create schema if not exists fitness_journal_meta;
revoke all on schema fitness_journal_meta from public,anon,authenticated;
create table if not exists fitness_journal_meta.migrations(version text primary key,checksum text not null,applied_at timestamptz not null default now());
revoke all on table fitness_journal_meta.migrations from public,anon,authenticated;

do $fj_apply$ begin
if exists(select 1 from fitness_journal_meta.migrations where version='202610130001') then
 if not exists(select 1 from fitness_journal_meta.migrations where version='202610130001' and checksum='112e18c8fd50e8a77fac55cf26d1c53e400cef5e2bd110a5b81a6824a0d6643d') then raise exception '迁移 202610130001 校验和不匹配，已停止'; end if;
else
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('profiles','exercises','equipment','workout_sessions','workout_exercises','workout_sets','meal_entries','meal_photos','import_batches','import_previews','daily_checkins','checkin_preferences','body_goals','body_measurements')) then raise exception '已有业务表但没有迁移记录：为保留数据已停止，请先运行 supabase/inspect.sql 核对，不要重建表'; end if;
 execute $fj_migration_202610130001$
-- Apply through Supabase migrations / SQL editor, never through the browser.
create extension if not exists pgcrypto;

create table public.profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '', unit text not null default 'kg' check (unit in ('kg','lb')),
 timezone text not null default 'Asia/Shanghai'
);
create table public.exercises (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 120), muscle_group text not null default '', notes text not null default '',
 hidden boolean not null default false, deleted_at timestamptz, unique(id,user_id)
);
create table public.equipment (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 120), type text not null check(type in ('selectorized','plate_loaded','barbell','dumbbell','smith','bodyweight')),
 unit text not null default 'kg' check(unit in ('kg','lb')), rule text not null check(rule in ('display','per_side','total','single','bodyweight','assistance','added','unknown')),
 initial_weight numeric check(initial_weight >= 0), increments jsonb not null default '[]', notes text not null default '',
 hidden boolean not null default false, deleted_at timestamptz, unique(id,user_id)
);
create table public.import_batches (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 filename text not null, file_hash text not null check(file_hash ~ '^[a-f0-9]{64}$'), row_count integer not null check(row_count>0),
 report jsonb not null default '{}', created_at timestamptz not null default now(), undone_at timestamptz,
 unique(user_id,file_hash), unique(id,user_id)
);
create table public.workout_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 training_date date not null, status text not null check(status in ('planned','in_progress','paused','completed')),
 started_at timestamptz, ended_at timestamptz, paused_at timestamptz, notes text not null default '',
 revision integer not null default 1, imported_revision integer, import_batch_id uuid,
 deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,user_id), foreign key(import_batch_id,user_id) references public.import_batches(id,user_id) on delete restrict
);
create table public.workout_exercises (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null, exercise_id uuid, equipment_id uuid, position integer not null check(position>=0),
 exercise_name text not null, muscle_group text not null default '', equipment_snapshot jsonb, notes text not null default '',
 unique(id,user_id), unique(session_id,position),
 foreign key(session_id,user_id) references public.workout_sessions(id,user_id) on delete cascade,
 foreign key(exercise_id,user_id) references public.exercises(id,user_id) on delete restrict,
 foreign key(equipment_id,user_id) references public.equipment(id,user_id) on delete restrict
);
create table public.workout_sets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 workout_exercise_id uuid not null, position integer not null check(position>=0),
 role text not null check(role in ('warmup','work','supplement')), tags text[] not null default '{}',
 weight jsonb not null, planned_weight jsonb, reps integer not null check(reps between 0 and 1000),
 completed boolean not null default false, notes text not null default '', rir numeric check(rir between 0 and 10), rpe numeric check(rpe between 0 and 10),
 started_at timestamptz, completed_at timestamptz, rest_seconds integer check(rest_seconds between 0 and 86400), rest_ends_at timestamptz,
 unique(id,user_id), unique(workout_exercise_id,position),
 foreign key(workout_exercise_id,user_id) references public.workout_exercises(id,user_id) on delete cascade,
 check(weight->>'unit' in ('kg','lb')), check(weight->>'mode' in ('display','per_side','total','single','bodyweight','assistance','added','unknown')),
 check(jsonb_typeof(weight)='object' and weight ?& array['mode','unit','value','left','right','base']),
 check((weight->>'value')::numeric between 0 and 10000), check((weight->>'left')::numeric between 0 and 10000), check((weight->>'right')::numeric between 0 and 10000), check((weight->>'base')::numeric between 0 and 10000),
 check(planned_weight is null or (jsonb_typeof(planned_weight)='object' and planned_weight ?& array['mode','unit','value','left','right','base'] and planned_weight->>'unit' in ('kg','lb') and planned_weight->>'mode' in ('display','per_side','total','single','bodyweight','assistance','added','unknown'))),
 check((planned_weight->>'value')::numeric between 0 and 10000), check((planned_weight->>'left')::numeric between 0 and 10000), check((planned_weight->>'right')::numeric between 0 and 10000), check((planned_weight->>'base')::numeric between 0 and 10000)
);
create table public.meal_entries (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 meal_date date not null, meal_type text not null check(meal_type in ('breakfast','lunch','dinner')), notes text not null default '',
 unique(user_id,meal_date,meal_type), unique(id,user_id)
);
create table public.meal_photos (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 meal_id uuid not null, storage_path text not null unique, original_name text not null, mime_type text not null default 'image/jpeg',
 byte_size integer not null check(byte_size>0), deleted_at timestamptz, created_at timestamptz not null default now(),
 foreign key(meal_id,user_id) references public.meal_entries(id,user_id) on delete cascade,
 check(split_part(storage_path,'/',1)=user_id::text), check(split_part(storage_path,'/',2)=meal_id::text)
);

create index sessions_date on public.workout_sessions(user_id,training_date);
create index workout_exercise_parent on public.workout_exercises(user_id,session_id);
create index workout_exercise_history on public.workout_exercises(user_id,exercise_id);
create index workout_set_parent on public.workout_sets(user_id,workout_exercise_id);
create index meal_date on public.meal_entries(user_id,meal_date);
create index meal_photo_parent on public.meal_photos(user_id,meal_id);
create index equipment_owner on public.equipment(user_id);
create index exercises_owner on public.exercises(user_id);
create index batch_sessions on public.workout_sessions(user_id,import_batch_id);

do $$ declare t text; begin
 foreach t in array array['profiles','exercises','equipment','workout_sessions','workout_exercises','workout_sets','meal_entries','meal_photos','import_batches'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy owner_only on public.%I for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('revoke all on public.%I from anon',t);
 end loop;
end $$;

create function public.create_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(user_id) values(new.id); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile();
insert into public.profiles(user_id) select id from auth.users on conflict do nothing;

create function public.bump_revision() returns trigger language plpgsql set search_path='' as $$
begin new.revision=old.revision+1; new.updated_at=now(); return new; end $$;
create trigger session_revision before update on public.workout_sessions for each row execute function public.bump_revision();
-- Protect undo even when a client edits a child row directly via PostgREST.
create function public.touch_parent_session() returns trigger language plpgsql security invoker set search_path='' as $$
declare sid uuid; begin
 if tg_table_name='workout_exercises' then
  if tg_op <> 'INSERT' then update public.workout_sessions set updated_at=now() where id=old.session_id; end if;
  if tg_op <> 'DELETE' then update public.workout_sessions set updated_at=now() where id=new.session_id; end if;
 else
  if tg_op <> 'INSERT' then select session_id into sid from public.workout_exercises where id=old.workout_exercise_id; update public.workout_sessions set updated_at=now() where id=sid; end if;
  if tg_op <> 'DELETE' then select session_id into sid from public.workout_exercises where id=new.workout_exercise_id; update public.workout_sessions set updated_at=now() where id=sid; end if;
 end if;
 return null;
end $$;
create trigger exercise_touch after insert or update or delete on public.workout_exercises for each row execute function public.touch_parent_session();
create trigger set_touch after insert or update or delete on public.workout_sets for each row execute function public.touch_parent_session();

create function public.save_workout(payload jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare uid uuid=auth.uid(); sid uuid=(payload->>'id')::uuid; existing public.workout_sessions; ex jsonb; st jsonb; ei integer=0; si integer; eid uuid;
begin
 if uid is null then raise exception '请先登录'; end if;
 if jsonb_array_length(payload->'exercises')>100 then raise exception '动作过多'; end if;
 select * into existing from public.workout_sessions where id=sid for update;
 if found then
  if existing.deleted_at is not null then raise exception '训练已删除，请先恢复'; end if;
  if existing.revision<>(payload->>'revision')::integer then raise exception '版本冲突：记录已在另一设备修改，请重新加载'; end if;
  update public.workout_sessions set training_date=(payload->>'training_date')::date,status=payload->>'status',started_at=(payload->>'started_at')::timestamptz,ended_at=(payload->>'ended_at')::timestamptz,paused_at=(payload->>'paused_at')::timestamptz,notes=payload->>'notes' where id=sid;
 else
  if (payload->>'revision')::integer<>0 then raise exception '记录不存在'; end if;
  insert into public.workout_sessions(id,user_id,training_date,status,started_at,ended_at,paused_at,notes) values(sid,uid,(payload->>'training_date')::date,payload->>'status',(payload->>'started_at')::timestamptz,(payload->>'ended_at')::timestamptz,(payload->>'paused_at')::timestamptz,payload->>'notes');
 end if;
 delete from public.workout_exercises where session_id=sid;
 for ex in select value from jsonb_array_elements(payload->'exercises') loop
  eid=(ex->>'id')::uuid;
  insert into public.workout_exercises(id,user_id,session_id,exercise_id,equipment_id,position,exercise_name,muscle_group,equipment_snapshot,notes) values(eid,uid,sid,(ex->>'exercise_id')::uuid,(ex->>'equipment_id')::uuid,ei,ex->>'exercise_name',ex->>'muscle_group',nullif(ex->'equipment_snapshot','null'::jsonb),ex->>'notes');
  si=0;
  if jsonb_array_length(ex->'sets')>100 then raise exception '组数过多'; end if;
  for st in select value from jsonb_array_elements(ex->'sets') loop
   insert into public.workout_sets(id,user_id,workout_exercise_id,position,role,tags,weight,planned_weight,reps,completed,notes,rir,rpe,started_at,completed_at,rest_seconds,rest_ends_at)
   values((st->>'id')::uuid,uid,eid,si,st->>'role',array(select jsonb_array_elements_text(st->'tags')),st->'weight',nullif(st->'planned_weight','null'::jsonb),(st->>'reps')::integer,(st->>'completed')::boolean,st->>'notes',(st->>'rir')::numeric,(st->>'rpe')::numeric,(st->>'started_at')::timestamptz,(st->>'completed_at')::timestamptz,(st->>'rest_seconds')::integer,(st->>'rest_ends_at')::timestamptz);
   si=si+1;
  end loop;
  ei=ei+1;
 end loop;
 return (select jsonb_build_object('id',id,'revision',revision) from public.workout_sessions where id=sid);
end $$;

create function public.commit_import(file_name text, file_hash text, row_count integer, report jsonb, sessions jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare bid uuid; s jsonb; result jsonb; ex jsonb; pos integer; eid uuid; begin
 if auth.uid() is null then raise exception '请先登录'; end if;
 if jsonb_array_length(sessions) not between 1 and 1000 then raise exception '导入训练数量超出限制'; end if;
 insert into public.import_batches(user_id,filename,file_hash,row_count,report) values(auth.uid(),file_name,file_hash,row_count,report) returning id into bid;
 for s in select value from jsonb_array_elements(sessions) loop
  if (s->>'revision')::integer<>0 then raise exception '导入不能覆盖已有记录'; end if;
  -- Associate verified exercise names; equipment type remains explicitly unknown.
  pos=0;
  for ex in select value from jsonb_array_elements(s->'exercises') loop
   if ex->>'exercise_id' is null then
    select id into eid from public.exercises where user_id=auth.uid() and name=ex->>'exercise_name' and deleted_at is null order by id limit 1;
    if eid is null then insert into public.exercises(user_id,name) values(auth.uid(),ex->>'exercise_name') returning id into eid; end if;
    s=jsonb_set(s,array['exercises',pos::text,'exercise_id'],to_jsonb(eid::text));
   end if;
   pos=pos+1;
  end loop;
  result=public.save_workout(s);
  update public.workout_sessions set import_batch_id=bid,imported_revision=revision+1 where id=(result->>'id')::uuid;
 end loop;
 return bid;
end $$;

create function public.undo_import(batch_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare removed integer; kept integer; b public.import_batches; begin
 select * into b from public.import_batches where id=batch_id for update;
 if not found then raise exception '批次不存在'; end if;
 if b.undone_at is not null then raise exception '此批次已撤销'; end if;
 select count(*) into kept from public.workout_sessions where import_batch_id=batch_id and deleted_at is null and revision<>imported_revision;
 update public.workout_sessions set deleted_at=now() where import_batch_id=batch_id and deleted_at is null and revision=imported_revision;
 get diagnostics removed=row_count;
 update public.import_batches set undone_at=now() where id=batch_id;
 return jsonb_build_object('removed',removed,'kept',kept);
end $$;

-- Private bucket. Paths bind owner and meal. Soft-deleted photos retain bytes for recovery.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('meal-photos','meal-photos',false,8388608,array['image/jpeg']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy meal_storage_read on storage.objects for select to authenticated using(bucket_id='meal-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy meal_storage_insert on storage.objects for insert to authenticated with check(bucket_id='meal-photos' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.meal_entries m where m.id::text=(storage.foldername(name))[2] and m.user_id=(select auth.uid())));
create policy meal_storage_delete on storage.objects for delete to authenticated using(bucket_id='meal-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);

revoke all on function public.save_workout(jsonb), public.commit_import(text,text,integer,jsonb,jsonb), public.undo_import(uuid) from public,anon;
grant execute on function public.save_workout(jsonb), public.commit_import(text,text,integer,jsonb,jsonb), public.undo_import(uuid) to authenticated;
revoke all on function public.create_profile() from public,anon,authenticated;

$fj_migration_202610130001$;
 insert into fitness_journal_meta.migrations(version,checksum) values('202610130001','112e18c8fd50e8a77fac55cf26d1c53e400cef5e2bd110a5b81a6824a0d6643d');
end if; end $fj_apply$;

do $fj_apply$ begin
if exists(select 1 from fitness_journal_meta.migrations where version='202610130002') then
 if not exists(select 1 from fitness_journal_meta.migrations where version='202610130002' and checksum='92534b3d64fe8e44f48b88b4928adc7fa63da31594f49ba4c9893f814842b9f9') then raise exception '迁移 202610130002 校验和不匹配，已停止'; end if;
else

 execute $fj_migration_202610130002$
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

$fj_migration_202610130002$;
 insert into fitness_journal_meta.migrations(version,checksum) values('202610130002','92534b3d64fe8e44f48b88b4928adc7fa63da31594f49ba4c9893f814842b9f9');
end if; end $fj_apply$;

do $fj_apply$ begin
if exists(select 1 from fitness_journal_meta.migrations where version='202610130003') then
 if not exists(select 1 from fitness_journal_meta.migrations where version='202610130003' and checksum='691a1159d9e82a2f1c0c39d599b609694ba0e2716753bc7ccd3d544ec10b7da1') then raise exception '迁移 202610130003 校验和不匹配，已停止'; end if;
else

 execute $fj_migration_202610130003$
-- Supabase's default grants may include TRUNCATE, which bypasses row security.
-- Restrict only this application's tables; do not change unrelated schema defaults.
do $$ declare t text; begin
 foreach t in array array['profiles','exercises','equipment','workout_sessions','workout_exercises','workout_sets','meal_entries','meal_photos','import_batches','import_previews'] loop
  execute format('revoke all privileges on table public.%I from public, anon, authenticated',t);
  if t='import_previews' then
   execute format('grant select,insert,delete on table public.%I to authenticated',t);
  else
   execute format('grant select,insert,update,delete on table public.%I to authenticated',t);
  end if;
 end loop;
end $$;
revoke all on function public.bump_revision(), public.touch_parent_session() from public,anon,authenticated;
-- Trigger execution remains internal; no RPC entry point is needed for these helpers.

$fj_migration_202610130003$;
 insert into fitness_journal_meta.migrations(version,checksum) values('202610130003','691a1159d9e82a2f1c0c39d599b609694ba0e2716753bc7ccd3d544ec10b7da1');
end if; end $fj_apply$;

do $fj_apply$ begin
if exists(select 1 from fitness_journal_meta.migrations where version='202610140001') then
 if not exists(select 1 from fitness_journal_meta.migrations where version='202610140001' and checksum='e5c70700ac66cdbfb2449c77d69ab54b8825db2ec7361589d721075a9291d68f') then raise exception '迁移 202610140001 校验和不匹配，已停止'; end if;
else

 execute $fj_migration_202610140001$
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

$fj_migration_202610140001$;
 insert into fitness_journal_meta.migrations(version,checksum) values('202610140001','e5c70700ac66cdbfb2449c77d69ab54b8825db2ec7361589d721075a9291d68f');
end if; end $fj_apply$;

do $fj_apply$ begin
if exists(select 1 from fitness_journal_meta.migrations where version='202610140002') then
 if not exists(select 1 from fitness_journal_meta.migrations where version='202610140002' and checksum='df7e4885154cd1295d067e8ab8acd2043ee85437889974d00c29679d78eec322') then raise exception '迁移 202610140002 校验和不匹配，已停止'; end if;
else

 execute $fj_migration_202610140002$
-- Nullable classification preserves existing records without guessing training types.
ALTER TABLE public.workout_sessions ADD COLUMN training_type text CHECK (training_type IN ('strength','cardio'));

create or replace function public.save_workout(payload jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare uid uuid=auth.uid(); sid uuid=(payload->>'id')::uuid; existing public.workout_sessions; ex jsonb; st jsonb; ei integer=0; si integer; eid uuid;
begin
 if uid is null then raise exception '请先登录'; end if;
 if jsonb_array_length(payload->'exercises')>100 then raise exception '动作过多'; end if;
 select * into existing from public.workout_sessions where id=sid for update;
 if found then
  if existing.deleted_at is not null then raise exception '训练已删除，请先恢复'; end if;
  if existing.revision<>(payload->>'revision')::integer then raise exception '版本冲突：记录已在另一设备修改，请重新加载'; end if;
  update public.workout_sessions set training_date=(payload->>'training_date')::date,status=payload->>'status',started_at=(payload->>'started_at')::timestamptz,ended_at=(payload->>'ended_at')::timestamptz,paused_at=(payload->>'paused_at')::timestamptz,notes=payload->>'notes',training_type=case when payload ? 'training_type' then nullif(payload->>'training_type','') else training_type end where id=sid;
 else
  if (payload->>'revision')::integer<>0 then raise exception '记录不存在'; end if;
  insert into public.workout_sessions(id,user_id,training_date,status,started_at,ended_at,paused_at,notes,training_type) values(sid,uid,(payload->>'training_date')::date,payload->>'status',(payload->>'started_at')::timestamptz,(payload->>'ended_at')::timestamptz,(payload->>'paused_at')::timestamptz,payload->>'notes',nullif(payload->>'training_type',''));
 end if;
 delete from public.workout_exercises where session_id=sid;
 for ex in select value from jsonb_array_elements(payload->'exercises') loop
  eid=(ex->>'id')::uuid;
  insert into public.workout_exercises(id,user_id,session_id,exercise_id,equipment_id,position,exercise_name,muscle_group,equipment_snapshot,notes) values(eid,uid,sid,(ex->>'exercise_id')::uuid,(ex->>'equipment_id')::uuid,ei,ex->>'exercise_name',ex->>'muscle_group',nullif(ex->'equipment_snapshot','null'::jsonb),ex->>'notes');
  si=0;
  if jsonb_array_length(ex->'sets')>100 then raise exception '组数过多'; end if;
  for st in select value from jsonb_array_elements(ex->'sets') loop
   insert into public.workout_sets(id,user_id,workout_exercise_id,position,role,tags,weight,planned_weight,reps,completed,notes,rir,rpe,started_at,completed_at,rest_seconds,rest_ends_at)
   values((st->>'id')::uuid,uid,eid,si,st->>'role',array(select jsonb_array_elements_text(st->'tags')),st->'weight',nullif(st->'planned_weight','null'::jsonb),(st->>'reps')::integer,(st->>'completed')::boolean,st->>'notes',(st->>'rir')::numeric,(st->>'rpe')::numeric,(st->>'started_at')::timestamptz,(st->>'completed_at')::timestamptz,(st->>'rest_seconds')::integer,(st->>'rest_ends_at')::timestamptz);
   si=si+1;
  end loop;
  ei=ei+1;
 end loop;
 return (select jsonb_build_object('id',id,'revision',revision) from public.workout_sessions where id=sid);
end $$;

REVOKE ALL ON FUNCTION public.save_workout(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_workout(jsonb) TO authenticated;

$fj_migration_202610140002$;
 insert into fitness_journal_meta.migrations(version,checksum) values('202610140002','df7e4885154cd1295d067e8ab8acd2043ee85437889974d00c29679d78eec322');
end if; end $fj_apply$;

do $fj_apply$ begin
if exists(select 1 from fitness_journal_meta.migrations where version='202610160001') then
 if not exists(select 1 from fitness_journal_meta.migrations where version='202610160001' and checksum='e902270b3bacb5b2610c53c639361ed017b8241201fc697bdc94155840b07cc4') then raise exception '迁移 202610160001 校验和不匹配，已停止'; end if;
else

 execute $fj_migration_202610160001$
-- Additive only. Goals and measured facts deliberately live in separate tables.
create table public.body_goals (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  metric text not null check (metric in ('weight','body_fat')),
  start_value numeric,
  target_value numeric,
  revision integer not null default 0,
  mutation_id uuid,
  updated_at timestamptz not null default now(),
  primary key (user_id,metric),
  check (start_value is null or (start_value>0 and start_value<=case when metric='weight' then 500 else 100 end)),
  check (target_value is null or (target_value>0 and target_value<=case when metric='weight' then 500 else 100 end))
);
create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  metric text not null check(metric in ('weight','body_fat')),
  value numeric not null,
  measured_at timestamptz not null,
  source text not null default 'manual' check(length(source) between 1 and 80),
  source_record_id text,
  created_at timestamptz not null default now(),
  check (value>0 and value<=case when metric='weight' then 500 else 100 end),
  unique(user_id,source,source_record_id,metric)
);
create index body_measurement_latest on public.body_measurements(user_id,metric,measured_at desc,id desc);
alter table public.body_goals enable row level security;
alter table public.body_measurements enable row level security;
create policy body_goal_owner on public.body_goals for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy body_measurement_owner on public.body_measurements for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
revoke all on public.body_goals,public.body_measurements from public,anon,authenticated;
grant select,insert,update,delete on public.body_goals,public.body_measurements to authenticated;

-- Per-field compare-and-swap permits disjoint edits, rejects conflicting edits.
-- Row locks serialize concurrent callers; mutation ID makes an uncertain retry safe.
create function public.save_body_goal(payload jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare g public.body_goals; m text:=payload->>'metric'; changes jsonb:=payload->'changes';
begin
  if auth.uid() is null then raise exception '请先登录'; end if;
  if m not in ('weight','body_fat') or changes is null or jsonb_typeof(changes)<>'object'
    or changes='{}'::jsonb or changes- 'start_value' - 'target_value'<>'{}'::jsonb
    or payload->>'mutation_id' is null then raise exception '身体目标参数无效'; end if;
  insert into public.body_goals(user_id,metric) values(auth.uid(),m) on conflict do nothing;
  select * into strict g from public.body_goals where user_id=auth.uid() and metric=m for update;
  if g.mutation_id=(payload->>'mutation_id')::uuid then return to_jsonb(g); end if;
  if (changes?'start_value' and g.start_value is distinct from (payload->>'expected_start')::numeric)
    or (changes?'target_value' and g.target_value is distinct from (payload->>'expected_target')::numeric)
    then raise exception '版本冲突：目标已在其他窗口修改，输入已保留'; end if;
  update public.body_goals set
    start_value=case when changes?'start_value' then (changes->>'start_value')::numeric else start_value end,
    target_value=case when changes?'target_value' then (changes->>'target_value')::numeric else target_value end,
    revision=revision+1,mutation_id=(payload->>'mutation_id')::uuid,updated_at=now()
    where user_id=auth.uid() and metric=m returning * into g;
  return to_jsonb(g);
end $$;
revoke all on function public.save_body_goal(jsonb) from public,anon;
grant execute on function public.save_body_goal(jsonb) to authenticated;

$fj_migration_202610160001$;
 insert into fitness_journal_meta.migrations(version,checksum) values('202610160001','e902270b3bacb5b2610c53c639361ed017b8241201fc697bdc94155840b07cc4');
end if; end $fj_apply$;

do $fj_apply$ begin
if exists(select 1 from fitness_journal_meta.migrations where version='202610160002') then
 if not exists(select 1 from fitness_journal_meta.migrations where version='202610160002' and checksum='20ac6984a910673b21cf9c2d1f0b0a092eca58fbedfbd539d0f75a53878155c6') then raise exception '迁移 202610160002 校验和不匹配，已停止'; end if;
else

 execute $fj_migration_202610160002$
-- One network round trip. Two bounded index lookups retrieve actual latest facts.
create function public.body_overview() returns jsonb
language sql stable security invoker set search_path=public,pg_temp as $$
  select jsonb_build_object(
    'goals', (select coalesce(jsonb_agg(to_jsonb(g)), '[]'::jsonb) from (
      select metric,start_value,target_value,revision,mutation_id
      from public.body_goals where user_id=(select auth.uid()) order by metric
    ) g),
    'measurements', (select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) from
      unnest(array['weight','body_fat']) as requested(metric)
      cross join lateral (
        select id,metric,value,measured_at,source,source_record_id
        from public.body_measurements
        where user_id=(select auth.uid()) and metric=requested.metric and measured_at<=now()
        order by measured_at desc,id desc limit 1
      ) m)
  );
$$;
revoke all on function public.body_overview() from public,anon;
grant execute on function public.body_overview() to authenticated;

$fj_migration_202610160002$;
 insert into fitness_journal_meta.migrations(version,checksum) values('202610160002','20ac6984a910673b21cf9c2d1f0b0a092eca58fbedfbd539d0f75a53878155c6');
end if; end $fj_apply$;

do $fj_apply$ begin
if exists(select 1 from fitness_journal_meta.migrations where version='202610160003') then
 if not exists(select 1 from fitness_journal_meta.migrations where version='202610160003' and checksum='610029ccf7b9d595beac51358c8adebef212c05cf8f3c6bf88c33de781891c53') then raise exception '迁移 202610160003 校验和不匹配，已停止'; end if;
else

 execute $fj_migration_202610160003$
-- Manual readings are append-only facts, separate from editable goal endpoints.
create function public.save_body_measurement(payload jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  m public.body_measurements;
  latest_value numeric;
  requested_metric text:=payload->>'metric';
begin
  if auth.uid() is null then raise exception '请先登录'; end if;
  if requested_metric is null or requested_metric not in ('weight','body_fat')
    or jsonb_typeof(payload->'value') is distinct from 'number'
    or not payload?'expected_value' or payload->>'id' is null
    then raise exception '身体测量参数无效'; end if;
  -- Reuse the per-user/metric lock already used by goal edits. No goal values change.
  insert into public.body_goals(user_id,metric) values(auth.uid(),requested_metric) on conflict do nothing;
  perform 1 from public.body_goals where user_id=auth.uid() and metric=requested_metric for update;
  select * into m from public.body_measurements where user_id=auth.uid() and id=(payload->>'id')::uuid;
  if found then
    if m.metric<>requested_metric or m.value is distinct from (payload->>'value')::numeric
      then raise exception '测量请求标识重复'; end if;
    return to_jsonb(m);
  end if;
  select value into latest_value from public.body_measurements
    where user_id=auth.uid() and metric=requested_metric and measured_at<=clock_timestamp()
    order by measured_at desc,id desc limit 1;
  if latest_value is distinct from (payload->>'expected_value')::numeric
    then raise exception '版本冲突：目前数值已在其他窗口修改，输入已保留'; end if;
  insert into public.body_measurements(id,user_id,metric,value,measured_at,source,source_record_id)
    values((payload->>'id')::uuid,auth.uid(),requested_metric,(payload->>'value')::numeric,
      clock_timestamp(),'manual',payload->>'id') returning * into m;
  return to_jsonb(m);
end $$;
revoke all on function public.save_body_measurement(jsonb) from public,anon;
grant execute on function public.save_body_measurement(jsonb) to authenticated;

$fj_migration_202610160003$;
 insert into fitness_journal_meta.migrations(version,checksum) values('202610160003','610029ccf7b9d595beac51358c8adebef212c05cf8f3c6bf88c33de781891c53');
end if; end $fj_apply$;

commit;
notify pgrst, 'reload schema';
select version,applied_at from fitness_journal_meta.migrations order by version;