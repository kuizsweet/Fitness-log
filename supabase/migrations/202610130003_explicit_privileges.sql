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
