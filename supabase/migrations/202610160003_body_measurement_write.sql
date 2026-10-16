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
