-- Daily goals: a target rep count per exercise for a given day, "completed"
-- once the user logs the actual set (creating real workout/exercise/set rows).

create table daily_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_date date not null,
  focus text not null default 'Workout',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, goal_date)
);

create table goal_items (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references daily_goals(id) on delete cascade,
  exercise_name text not null,
  target_sets int not null default 1,
  target_reps int not null,
  exercise_id uuid references exercises(id) on delete set null,
  created_at timestamptz not null default now()
);

create index goal_items_goal_idx on goal_items (goal_id);

alter table daily_goals enable row level security;
alter table goal_items enable row level security;

create policy "Users can view own daily_goals"
  on daily_goals for select
  using (auth.uid() = user_id);

create policy "Users can insert own daily_goals"
  on daily_goals for insert
  with check (auth.uid() = user_id);

create policy "Users can update own daily_goals"
  on daily_goals for update
  using (auth.uid() = user_id);

create policy "Users can delete own daily_goals"
  on daily_goals for delete
  using (auth.uid() = user_id);

create policy "Users can view own goal_items"
  on goal_items for select
  using (exists (
    select 1 from daily_goals
    where daily_goals.id = goal_items.goal_id
    and daily_goals.user_id = auth.uid()
  ));

create policy "Users can insert own goal_items"
  on goal_items for insert
  with check (exists (
    select 1 from daily_goals
    where daily_goals.id = goal_items.goal_id
    and daily_goals.user_id = auth.uid()
  ));

create policy "Users can update own goal_items"
  on goal_items for update
  using (exists (
    select 1 from daily_goals
    where daily_goals.id = goal_items.goal_id
    and daily_goals.user_id = auth.uid()
  ));

create policy "Users can delete own goal_items"
  on goal_items for delete
  using (exists (
    select 1 from daily_goals
    where daily_goals.id = goal_items.goal_id
    and daily_goals.user_id = auth.uid()
  ));
