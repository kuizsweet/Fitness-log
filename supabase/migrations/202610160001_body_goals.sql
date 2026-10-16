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
