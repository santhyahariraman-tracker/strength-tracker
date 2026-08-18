import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MonthNav } from "@/components/MonthNav";
import { exerciseEmoji } from "@/lib/exerciseEmoji";

function parseMonthParam(param: string | undefined): { year: number; month: number } {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split("-").map(Number);
    return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

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

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const thisWeekCount =
    workouts?.filter((w) => new Date(w.workout_date + "T00:00:00") >= startOfWeek)
      .length ?? 0;

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
