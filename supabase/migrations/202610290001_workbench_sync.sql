create table public.training_workbenches (
 user_id uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null check (jsonb_typeof(state)='object' and octet_length(state::text)<=2097152),
 revision bigint not null default 1 check (revision>0),
 updated_at timestamptz not null default now()
);
alter table public.training_workbenches enable row level security;
create policy training_workbenches_owner on public.training_workbenches
 for select to authenticated using (user_id=auth.uid());
revoke all on public.training_workbenches from public,anon,authenticated;
grant select on public.training_workbenches to authenticated;

-- All writes use a compare-and-swap. A stale browser cannot erase newer plans.
create function public.save_training_workbench(p_state jsonb,p_expected bigint)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid=auth.uid(); saved public.training_workbenches;
begin
 if uid is null then raise exception '请先登录'; end if;
 if p_state is null or jsonb_typeof(p_state)<>'object'
  or jsonb_typeof(p_state->'notes') is distinct from 'array'
  or jsonb_typeof(p_state->'assignments') is distinct from 'object'
  or octet_length(p_state::text)>2097152 then raise exception '无效的计划数据'; end if;
 if jsonb_array_length(p_state->'notes')>30 then raise exception '最多保留30张便签'; end if;
 if p_expected=0 then
  insert into public.training_workbenches(user_id,state) values(uid,p_state)
   on conflict do nothing returning * into saved;
 else
  update public.training_workbenches set state=p_state,revision=revision+1,updated_at=now()
   where user_id=uid and revision=p_expected returning * into saved;
 end if;
 if saved.user_id is null then raise exception '版本冲突，请重新读取计划'; end if;
 return jsonb_build_object('state',saved.state,'revision',saved.revision);
end $$;
revoke all on function public.save_training_workbench(jsonb,bigint) from public,anon;
grant execute on function public.save_training_workbench(jsonb,bigint) to authenticated;
