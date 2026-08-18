-- Strength training tracker schema

create table workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_date date not null,
  focus text not null,
  created_at timestamptz not null default now()
);

create table exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table sets (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references exercises(id) on delete cascade,
  set_number int not null,
  reps int not null,
  weight numeric not null,
  weight_unit text not null check (weight_unit in ('lbs', 'kg')),
  created_at timestamptz not null default now()
);

create index workouts_user_date_idx on workouts (user_id, workout_date desc);
create index exercises_workout_idx on exercises (workout_id);
create index sets_exercise_idx on sets (exercise_id);

-- Row Level Security

alter table workouts enable row level security;
alter table exercises enable row level security;
alter table sets enable row level security;

create policy "Users can view own workouts"
  on workouts for select
  using (auth.uid() = user_id);

create policy "Users can insert own workouts"
  on workouts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own workouts"
  on workouts for update
  using (auth.uid() = user_id);

create policy "Users can delete own workouts"
  on workouts for delete
  using (auth.uid() = user_id);

create policy "Users can view own exercises"
  on exercises for select
  using (exists (
    select 1 from workouts
    where workouts.id = exercises.workout_id
    and workouts.user_id = auth.uid()
  ));

create policy "Users can insert own exercises"
  on exercises for insert
  with check (exists (
    select 1 from workouts
    where workouts.id = exercises.workout_id
    and workouts.user_id = auth.uid()
  ));

create policy "Users can update own exercises"
  on exercises for update
  using (exists (
    select 1 from workouts
    where workouts.id = exercises.workout_id
    and workouts.user_id = auth.uid()
  ));

create policy "Users can delete own exercises"
  on exercises for delete
  using (exists (
    select 1 from workouts
    where workouts.id = exercises.workout_id
    and workouts.user_id = auth.uid()
  ));

create policy "Users can view own sets"
  on sets for select
  using (exists (
    select 1 from exercises
    join workouts on workouts.id = exercises.workout_id
    where exercises.id = sets.exercise_id
    and workouts.user_id = auth.uid()
  ));

create policy "Users can insert own sets"
  on sets for insert
  with check (exists (
    select 1 from exercises
    join workouts on workouts.id = exercises.workout_id
    where exercises.id = sets.exercise_id
    and workouts.user_id = auth.uid()
  ));

create policy "Users can update own sets"
  on sets for update
  using (exists (
    select 1 from exercises
    join workouts on workouts.id = exercises.workout_id
    where exercises.id = sets.exercise_id
    and workouts.user_id = auth.uid()
  ));

create policy "Users can delete own sets"
  on sets for delete
  using (exists (
    select 1 from exercises
    join workouts on workouts.id = exercises.workout_id
    where exercises.id = sets.exercise_id
    and workouts.user_id = auth.uid()
  ));
