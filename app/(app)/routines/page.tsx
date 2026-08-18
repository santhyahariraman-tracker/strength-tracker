import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RoutinesList } from "@/components/RoutinesList";

export default async function RoutinesPage() {
  const supabase = await createClient();

  const { data: routines, error } = await supabase
    .from("routines")
    .select("id, day_of_week, focus, routine_exercises(id, exercise_name, target_sets, target_reps, position)")
    .order("day_of_week", { ascending: true });

  const { data: exs } = await supabase.from("exercises").select("name");
  const exerciseSuggestions = [...new Set((exs ?? []).map((e) => e.name))];

  const tableMissing = !!error && /does not exist|schema cache/i.test(error.message);

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Routines</h1>
        <Link href="/" className="text-sm text-text-muted underline">
          ← Back
        </Link>
      </div>

      {tableMissing ? (
        <p className="text-sm text-text-muted">
          Routines aren&apos;t set up yet — run the routines migration in Supabase to
          enable this feature.
        </p>
      ) : (
        <RoutinesList
          routines={(routines ?? []).map((r) => ({
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
          }))}
          exerciseSuggestions={exerciseSuggestions}
        />
      )}
    </div>
  );
}
