import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MonthNav } from "@/components/MonthNav";
import { exerciseEmoji } from "@/lib/exerciseEmoji";
import { GoalPrompt } from "@/components/GoalPrompt";
import { DailyGoalCard } from "@/components/DailyGoalCard";
import { LastWeekdaySummary, type WeekdaySummaryItem } from "@/components/LastWeekdaySummary";
import { suggestNextWeight } from "@/lib/overload";

function parseMonthParam(param: string | undefined): { year: number; month: number } {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split("-").map(Number);
    return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function isTableMissing(message: string) {
  return /does not exist|schema cache/i.test(message);
}

function todayLocalISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

type HistorySet = { reps: number; weight: number; weight_unit: "lbs" | "kg" };
type HistoryExercise = { name: string; sets: HistorySet[] };
type HistoryWorkout = { workout_date: string; exercises: HistoryExercise[] };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const supabase = await createClient();
  const { month: monthParam } = await searchParams;
  const { year, month } = parseMonthParam(monthParam);

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);
  const toISODate = (d: Date) => d.toISOString().slice(0, 10);

  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const todayISO = todayLocalISO();

  const { count: totalWorkoutCount } = await supabase
    .from("workouts")
    .select("id", { count: "exact", head: true });

  const { data: workouts, error } = await supabase
    .from("workouts")
    .select("id, workout_date, focus, exercises(name, position)")
    .gte("workout_date", toISODate(monthStart))
    .lt("workout_date", toISODate(monthEnd))
    .order("workout_date", { ascending: false })
    .order("created_at", { ascending: false });

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const thisWeekCount =
    workouts?.filter((w) => new Date(w.workout_date + "T00:00:00") >= startOfWeek)
      .length ?? 0;

  // --- Daily goal (gracefully absent until its migration is applied) ---
  let todayGoal: {
    id: string;
    completed_at: string | null;
    items: {
      id: string;
      exerciseName: string;
      targetSets: number;
      targetReps: number;
      exerciseId: string | null;
    }[];
  } | null = null;
  let goalsTableExists = true;

  const goalRes = await supabase
    .from("daily_goals")
    .select("id, completed_at, goal_items(id, exercise_name, target_sets, target_reps, exercise_id)")
    .eq("goal_date", todayISO)
    .maybeSingle();

  if (goalRes.error) {
    if (isTableMissing(goalRes.error.message)) goalsTableExists = false;
  } else if (goalRes.data) {
    todayGoal = {
      id: goalRes.data.id,
      completed_at: goalRes.data.completed_at,
      items: goalRes.data.goal_items.map((it) => ({
        id: it.id,
        exerciseName: it.exercise_name,
        targetSets: it.target_sets,
        targetReps: it.target_reps,
        exerciseId: it.exercise_id,
      })),
    };
  }

  // --- Routines (one per day of week), for auto-filling today's goal ---
  let routines: {
    id: string;
    dayOfWeek: number;
    focus: string;
    items: { exerciseName: string; targetSets: number; targetReps: number }[];
  }[] = [];
  const routinesRes = await supabase
    .from("routines")
    .select("id, day_of_week, focus, routine_exercises(exercise_name, target_sets, target_reps, position)");
  if (!routinesRes.error && routinesRes.data) {
    routines = routinesRes.data.map((r) => ({
      id: r.id,
      dayOfWeek: r.day_of_week,
      focus: r.focus,
      items: [...r.routine_exercises]
        .sort((a, b) => a.position - b.position)
        .map((it) => ({
          exerciseName: it.exercise_name,
          targetSets: it.target_sets,
          targetReps: it.target_reps,
        })),
    }));
  }
  const todayRoutine = routines.find((r) => r.dayOfWeek === now.getDay()) ?? null;

  // --- Sets already logged today for each goal item, keyed by exercise id ---
  const goalSetsByExercise: Record<
    string,
    { id: string; setNumber: number; reps: number; weight: number; weightUnit: "lbs" | "kg" }[]
  > = {};
  if (todayGoal) {
    const exerciseIds = todayGoal.items
      .filter((it) => it.exerciseId)
      .map((it) => it.exerciseId as string);
    if (exerciseIds.length > 0) {
      const { data: loggedSets } = await supabase
        .from("sets")
        .select("id, exercise_id, set_number, reps, weight, weight_unit")
        .in("exercise_id", exerciseIds)
        .order("set_number", { ascending: true });
      for (const s of loggedSets ?? []) {
        (goalSetsByExercise[s.exercise_id] ??= []).push({
          id: s.id,
          setNumber: s.set_number,
          reps: s.reps,
          weight: s.weight,
          weightUnit: s.weight_unit,
        });
      }
    }
  }

  const { data: exs } = await supabase.from("exercises").select("name");
  const exerciseSuggestions = [...new Set((exs ?? []).map((e) => e.name))];

  // --- History for "last time on this weekday" + progressive overload ---
  const { data: history } = await supabase
    .from("workouts")
    .select("workout_date, exercises(name, sets(reps, weight, weight_unit))")
    .lt("workout_date", todayISO)
    .order("workout_date", { ascending: false })
    .limit(200);

  const historyRows = (history ?? []) as HistoryWorkout[];

  const todayDow = now.getDay();
  const lastSameWeekday = historyRows.find(
    (w) => new Date(w.workout_date + "T00:00:00").getDay() === todayDow
  );

  // Most recent prior top-set per exercise name, across all history.
  const lastTopSetByExercise = new Map<
    string,
    { weight: number; unit: "lbs" | "kg"; reps: number; date: string }
  >();
  for (const w of historyRows) {
    for (const ex of w.exercises) {
      if (lastTopSetByExercise.has(ex.name)) continue;
      if (ex.sets.length === 0) continue;
      const top = ex.sets.reduce((a, b) => (b.weight > a.weight ? b : a));
      lastTopSetByExercise.set(ex.name, {
        weight: top.weight,
        unit: top.weight_unit,
        reps: top.reps,
        date: w.workout_date,
      });
    }
  }

  // Suggestions keyed by exercise name, only for exercises in today's goal
  // (a target rep count is required to apply the heuristic).
  const suggestions: Record<string, { weight: number; unit: "lbs" | "kg" } | null> = {};
  if (todayGoal) {
    for (const item of todayGoal.items) {
      const last = lastTopSetByExercise.get(item.exerciseName);
      suggestions[item.exerciseName] = last
        ? suggestNextWeight(last.weight, last.unit, last.reps, item.targetReps)
        : null;
    }
  }

  const weekdaySummaryItems: WeekdaySummaryItem[] = lastSameWeekday
    ? lastSameWeekday.exercises
        .filter((ex) => ex.sets.length > 0)
        .map((ex) => {
          const top = ex.sets.reduce((a, b) => (b.weight > a.weight ? b : a));
          return {
            exerciseName: ex.name,
            weight: top.weight,
            unit: top.weight_unit,
            reps: top.reps,
            suggestion: suggestions[ex.name] ?? null,
          };
        })
    : [];

  return (
    <div className="flex flex-col gap-5 pt-2">
      <MonthNav />

      <div className="rounded-2xl p-5 bg-gradient-to-br from-accent-purple to-accent-purple-2 shadow-lg">
        <p className="text-xs font-semibold tracking-wide text-white/70 uppercase">
          {now.toLocaleDateString("en-US", { weekday: "long" })} · Today
        </p>
        <p className="text-2xl font-bold text-white mt-1">
          {now.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <p className="text-sm text-white/80 mt-2">
          {totalWorkoutCount ?? 0} workout{totalWorkoutCount === 1 ? "" : "s"} logged
          total
        </p>
      </div>

      <div className="rounded-xl px-4 py-3 bg-gradient-to-r from-accent-orange to-accent-orange-2 flex items-center gap-2 shadow">
        <span>🔥</span>
        <p className="text-sm font-medium text-white">
          {thisWeekCount} workout{thisWeekCount === 1 ? "" : "s"} logged this week
        </p>
      </div>

      {isCurrentMonth && (
        <LastWeekdaySummary
          weekdayLabel={now.toLocaleDateString("en-US", { weekday: "long" })}
          dateLabel={
            lastSameWeekday
              ? new Date(lastSameWeekday.workout_date + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : ""
          }
          items={weekdaySummaryItems}
        />
      )}

      {isCurrentMonth && goalsTableExists && (
        todayGoal ? (
          <DailyGoalCard
            goalId={todayGoal.id}
            items={todayGoal.items}
            loggedSetsByExercise={goalSetsByExercise}
            suggestions={suggestions}
            alreadyComplete={!!todayGoal.completed_at}
          />
        ) : (
          <GoalPrompt
            date={todayISO}
            todayRoutine={todayRoutine}
            routines={routines}
            exerciseSuggestions={exerciseSuggestions}
          />
        )
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-widest text-text-muted uppercase">
          Workouts
        </h2>
        <Link
          href="/workouts/new"
          className="text-xs font-medium text-accent-orange"
        >
          + New
        </Link>
      </div>

      {error && <p className="text-sm text-danger">{error.message}</p>}

      {workouts && workouts.length === 0 && (
        <div className="rounded-xl border border-border bg-surface px-4 py-6 text-center">
          <p className="text-sm text-text-muted">
            No workouts logged this month. Tap “+ New” to add one.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-2.5">
        {workouts?.map((w) => {
          const sortedExercises = [...w.exercises].sort((a, b) => a.position - b.position);
          const icon = sortedExercises[0] ? exerciseEmoji(sortedExercises[0].name) : "💪";
          return (
          <li key={w.id}>
            <Link
              href={`/workouts/${w.id}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 active:bg-surface-2"
            >
              <div className="w-10 h-10 shrink-0 rounded-lg bg-surface-2 flex items-center justify-center text-lg">
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{w.focus}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {formatDate(w.workout_date)} · {w.exercises.length} exercise
                  {w.exercises.length === 1 ? "" : "s"}
                </p>
              </div>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
