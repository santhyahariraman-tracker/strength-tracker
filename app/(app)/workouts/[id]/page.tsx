import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkoutDetail } from "@/components/WorkoutDetail";

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  let workout = (
    await supabase
      .from("workouts")
      .select(
        "id, workout_date, focus, exercises(id, name, position, notes, sets(id, set_number, reps, weight, weight_unit))"
      )
      .eq("id", id)
      .single()
  ).data;

  // `notes` ships in a migration the user applies manually; fall back to a
  // query without it so the page still works before that migration runs.
  if (!workout) {
    const fallback = await supabase
      .from("workouts")
      .select(
        "id, workout_date, focus, exercises(id, name, position, sets(id, set_number, reps, weight, weight_unit))"
      )
      .eq("id", id)
      .single();
    if (fallback.data) {
      workout = {
        ...fallback.data,
        exercises: fallback.data.exercises.map((ex) => ({ ...ex, notes: null })),
      };
    }
  }

  if (!workout) notFound();

  const { data: exs } = await supabase.from("exercises").select("name");
  const exerciseSuggestions = [...new Set((exs ?? []).map((e) => e.name))];

  const exercises = [...workout.exercises].sort((a, b) => a.position - b.position);
  for (const ex of exercises) {
    ex.sets.sort((a, b) => a.set_number - b.set_number);
  }

  return (
    <WorkoutDetail
      workout={{ id: workout.id, date: workout.workout_date, focus: workout.focus }}
      exercises={exercises}
      exerciseSuggestions={exerciseSuggestions}
    />
  );
}
