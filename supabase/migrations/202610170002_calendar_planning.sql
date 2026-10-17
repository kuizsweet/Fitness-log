-- Calendar classifications are real, editable workout_sessions, not a parallel
-- day-marker store. Bare new sessions remain planned, never fake completions.
create or replace function public.calendar_day_state(p_date date)
returns jsonb language sql stable security invoker set search_path = public as $$
  with roots as (
    select s.*, (s.started_at is not null or s.ended_at is not null or s.paused_at is not null
      or s.status in ('in_progress','paused') or s.notes <> '' or s.import_batch_id is not null
      or exists(select 1 from public.workout_exercises e where e.session_id=s.id and e.user_id=s.user_id)) as detailed
    from public.workout_sessions s
    where s.user_id=(select auth.uid()) and s.training_date=p_date and s.deleted_at is null
  ), grouped as (
    select training_date,training_type,status,count(*) as count from roots
    group by training_date,training_type,status
  )
  select jsonb_build_object(
    'training_date',p_date,
    'mode',case when bool_or(training_type='strength') and bool_or(training_type='cardio') then 'mixed'
      when bool_or(training_type='strength') then 'strength'
      when bool_or(training_type='cardio') then 'cardio' else 'rest' end,
    'locked',coalesce(bool_or(detailed),false),
    'version',md5(coalesce(string_agg(id::text||':'||revision::text,',' order by id),'')),
    'rows',coalesce((select jsonb_agg(to_jsonb(g)) from grouped g),'[]'::jsonb)
  ) from roots;
$$;
revoke all on function public.calendar_day_state(date) from public,anon;
grant execute on function public.calendar_day_state(date) to authenticated;

create or replace function public.set_calendar_training(p_date date,p_mode text,p_expected text)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare uid uuid=auth.uid(); state jsonb; wanted text[]; kind text; sid uuid;
  used uuid[]='{}'; affected uuid[]='{}';
begin
  if uid is null then raise exception '请先登录'; end if;
  if p_date is null or p_date < date '2020-01-01' or p_date > date '2030-12-31' then
    raise exception '日期超出 2020–2030 年范围'; end if;
  if p_mode is null or p_mode not in ('rest','strength','cardio','mixed') then raise exception '训练类型无效'; end if;
  -- Serialize calendar clicks across tabs/devices and lock existing roots before
  -- checking details. Child FK writes and normal save_workout respect row locks.
  perform pg_advisory_xact_lock(hashtextextended(uid::text||':'||p_date::text,0));
  perform id from public.workout_sessions where user_id=uid and training_date=p_date and deleted_at is null order by id for update;
  state=public.calendar_day_state(p_date);
  if (state->>'locked')::boolean then raise exception '当天已有具体训练内容，不能更改类型'; end if;
  if state->>'mode'=p_mode then return state||jsonb_build_object('affected_ids','[]'::jsonb); end if;
  if p_expected is distinct from state->>'version' then raise exception '版本冲突：当天记录已更新，请重新选择日期'; end if;
  select coalesce(array_agg(id),'{}') into affected from public.workout_sessions
    where user_id=uid and training_date=p_date and deleted_at is null;
  wanted=case p_mode when 'strength' then array['strength'] when 'cardio' then array['cardio']
    when 'mixed' then array['strength','cardio'] else array[]::text[] end;
  foreach kind in array wanted loop
    sid=null;
    select id into sid from public.workout_sessions
      where user_id=uid and id=any(affected) and deleted_at is null and not(id=any(used))
      order by (training_type=kind) desc nulls last,created_at,id limit 1;
    if sid is null then
      insert into public.workout_sessions(user_id,training_date,training_type,status)
        values(uid,p_date,kind,'planned') returning id into sid;
    else
      update public.workout_sessions set training_type=kind where id=sid and training_type is distinct from kind;
    end if;
    used=array_append(used,sid);
  end loop;
  -- Only roots proven entirely bare above can be changed/soft-deleted.
  update public.workout_sessions set deleted_at=now()
    where user_id=uid and id=any(affected) and deleted_at is null and not(id=any(used));
  return public.calendar_day_state(p_date)||jsonb_build_object('affected_ids',to_jsonb(affected||used));
end;
$$;
revoke all on function public.set_calendar_training(date,text,text) from public,anon;
grant execute on function public.set_calendar_training(date,text,text) to authenticated;

-- Same bounded month query; include planned classification and server-side locks.
drop function public.training_calendar(date,date);
create function public.training_calendar(p_from date,p_to date)
returns table(training_date date,training_type text,status text,count bigint,locked boolean,day_revision text)
language sql stable security invoker set search_path = public as $$
  with roots as (
    select s.*, (s.started_at is not null or s.ended_at is not null or s.paused_at is not null
      or s.status in ('in_progress','paused') or s.notes <> '' or s.import_batch_id is not null
      or exists(select 1 from public.workout_exercises e where e.session_id=s.id and e.user_id=s.user_id)) as detailed
    from public.workout_sessions s
    where s.user_id=(select auth.uid()) and s.deleted_at is null
      and s.training_date between greatest(p_from,date '2020-01-01') and least(p_to,date '2030-12-31')
      and date_trunc('month',p_from)=date_trunc('month',p_to)
  ), days as (
    select r.training_date,bool_or(r.detailed) as locked,
      md5(string_agg(r.id::text||':'||r.revision::text,',' order by r.id)) as day_revision
    from roots r group by r.training_date
  )
  select r.training_date,r.training_type,r.status,count(*),d.locked,d.day_revision
  from roots r join days d on d.training_date=r.training_date
  group by r.training_date,r.training_type,r.status,d.locked,d.day_revision
  order by r.training_date,r.training_type,r.status limit 372;
$$;
revoke all on function public.training_calendar(date,date) from public,anon;
grant execute on function public.training_calendar(date,date) to authenticated;
