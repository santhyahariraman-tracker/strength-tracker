import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: workouts, error } = await supabase
    .from("workouts")
    .select("id, workout_date, focus, exercises(count)")
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
      <div className="rounded-2xl p-5 bg-gradient-to-br from-accent-purple to-accent-purple-2 shadow-lg">
        <p className="text-xs font-semibold tracking-wide text-white/70 uppercase">
          {now.toLocaleDateString(undefined, { weekday: "long" })} · Today
        </p>
        <p className="text-2xl font-bold text-white mt-1">
          {now.toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <p className="text-sm text-white/80 mt-2">
          {workouts?.length ?? 0} workout{workouts?.length === 1 ? "" : "s"} logged
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
            No workouts logged yet. Tap “+ New” to add your first one.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-2.5">
        {workouts?.map((w) => (
          <li key={w.id}>
            <Link
              href={`/workouts/${w.id}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 active:bg-surface-2"
            >
              <div className="w-10 h-10 shrink-0 rounded-lg bg-surface-2 flex items-center justify-center text-lg">
                💪
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{w.focus}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {formatDate(w.workout_date)} · {w.exercises?.[0]?.count ?? 0} exercise
                  {(w.exercises?.[0]?.count ?? 0) === 1 ? "" : "s"}
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
        ))}
      </ul>
    </div>
  );
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
