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
