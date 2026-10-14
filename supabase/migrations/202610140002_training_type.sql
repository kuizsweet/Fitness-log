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
