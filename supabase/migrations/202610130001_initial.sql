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
