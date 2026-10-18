alter table public.meal_photos add column notes text not null default '' check (length(notes) <= 4000);
alter table public.meal_entries drop constraint meal_entries_meal_type_check;
alter table public.meal_entries add constraint meal_entries_meal_type_check check(meal_type in ('breakfast','lunch','dinner','snack'));
alter table public.meal_entries add column calories integer check (calories between 0 and 20000);
notify pgrst, 'reload schema';
