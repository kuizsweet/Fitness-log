-- Compact month markers, never load exercise/set trees for the calendar.
-- INVOKER + explicit auth.uid keep the existing RLS/ownership boundary.
create or replace function public.training_calendar(p_from date, p_to date)
returns table(training_date date, training_type text, status text, count bigint)
language sql stable security invoker set search_path = public as $$
  select s.training_date, s.training_type, s.status, count(*)
  from public.workout_sessions s
  where s.user_id = (select auth.uid())
    and s.deleted_at is null
    and s.training_date between greatest(p_from, date '2020-01-01') and least(p_to, date '2030-12-31')
    and date_trunc('month', p_from) = date_trunc('month', p_to)
  group by s.training_date, s.training_type, s.status
  order by s.training_date, s.training_type, s.status
  limit 372;
$$;
revoke all on function public.training_calendar(date,date) from public, anon;
grant execute on function public.training_calendar(date,date) to authenticated;

-- Small partial index covers status/type/date lookup plus deterministic LIMIT.
create index if not exists sessions_live_lookup
on public.workout_sessions(user_id, status, training_type, training_date, created_at, id)
where deleted_at is null;
