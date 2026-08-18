import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: workouts, error } = await supabase
    .from("workouts")
    .select("id, workout_date, focus, exercises(count)")
    .order("workout_date", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Your workouts</h1>
        <Link
          href="/workouts/new"
          className="bg-neutral-900 text-white rounded-md px-4 py-2 text-sm font-medium"
        >
          + New workout
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error.message}</p>}

      {workouts && workouts.length === 0 && (
        <p className="text-sm text-neutral-500">
          No workouts logged yet. Start by adding your first one.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {workouts?.map((w) => (
          <li key={w.id}>
            <Link
              href={`/workouts/${w.id}`}
              className="flex items-center justify-between border rounded-md px-4 py-3 hover:bg-neutral-50"
            >
              <div>
                <p className="font-medium">{formatDate(w.workout_date)}</p>
                <p className="text-sm text-neutral-500">{w.focus}</p>
              </div>
              <span className="text-sm text-neutral-400">
                {w.exercises?.[0]?.count ?? 0} exercise
                {(w.exercises?.[0]?.count ?? 0) === 1 ? "" : "s"}
              </span>
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
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
