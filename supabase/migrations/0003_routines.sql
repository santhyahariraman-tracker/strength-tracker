-- Reusable workout routines/templates

create table routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references routines(id) on delete cascade,
  exercise_name text not null,
  target_reps int not null,
  position int not null default 0
);

create index routine_exercises_routine_idx on routine_exercises (routine_id);

alter table routines enable row level security;
alter table routine_exercises enable row level security;

create policy "Users can view own routines"
  on routines for select
  using (auth.uid() = user_id);

create policy "Users can insert own routines"
  on routines for insert
  with check (auth.uid() = user_id);

create policy "Users can update own routines"
  on routines for update
  using (auth.uid() = user_id);

create policy "Users can delete own routines"
  on routines for delete
  using (auth.uid() = user_id);

create policy "Users can view own routine_exercises"
  on routine_exercises for select
  using (exists (
    select 1 from routines
    where routines.id = routine_exercises.routine_id
    and routines.user_id = auth.uid()
  ));

create policy "Users can insert own routine_exercises"
  on routine_exercises for insert
  with check (exists (
    select 1 from routines
    where routines.id = routine_exercises.routine_id
    and routines.user_id = auth.uid()
  ));

create policy "Users can update own routine_exercises"
  on routine_exercises for update
  using (exists (
    select 1 from routines
    where routines.id = routine_exercises.routine_id
    and routines.user_id = auth.uid()
  ));

create policy "Users can delete own routine_exercises"
  on routine_exercises for delete
  using (exists (
    select 1 from routines
    where routines.id = routine_exercises.routine_id
    and routines.user_id = auth.uid()
  ));
