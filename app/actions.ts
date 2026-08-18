"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SetInput = {
  reps: number;
  weight: number;
  weightUnit: "lbs" | "kg";
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

function isMissingNotesColumn(message: string) {
  return message.includes("notes") && /column|schema cache/i.test(message);
}

// The `notes` column ships in a migration the user applies manually (see
// supabase/migrations/0002_add_exercise_notes.sql). Until they run it, retry
// without `notes` so exercise creation still works.
async function insertExerciseRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: { workout_id: string; name: string; position: number; notes: string | null }
) {
  const first = await supabase.from("exercises").insert(row).select().single();
  if (!first.error) return first;
  if (isMissingNotesColumn(first.error.message)) {
    const { notes: _notes, ...withoutNotes } = row;
    return supabase.from("exercises").insert(withoutNotes).select().single();
  }
  return first;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createWorkout(input: {
  date: string;
  focus: string;
  exercises: { name: string; sets: SetInput[]; notes?: string }[];
}) {
  const { supabase, user } = await requireUser();

  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .insert({ user_id: user.id, workout_date: input.date, focus: input.focus })
    .select()
    .single();

  if (workoutError) throw new Error(workoutError.message);

  for (let i = 0; i < input.exercises.length; i++) {
    const ex = input.exercises[i];
    const { data: exercise, error: exerciseError } = await insertExerciseRow(supabase, {
      workout_id: workout.id,
      name: ex.name,
      position: i,
      notes: ex.notes || null,
    });

    if (exerciseError) throw new Error(exerciseError.message);

    if (ex.sets.length > 0) {
      const { error: setsError } = await supabase.from("sets").insert(
        ex.sets.map((s, idx) => ({
          exercise_id: exercise.id,
          set_number: idx + 1,
          reps: s.reps,
          weight: s.weight,
          weight_unit: s.weightUnit,
        }))
      );
      if (setsError) throw new Error(setsError.message);
    }
  }

  revalidatePath("/");
  return { id: workout.id as string };
}

export async function deleteWorkout(workoutId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("workouts").delete().eq("id", workoutId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function updateWorkout(
  workoutId: string,
  input: { date: string; focus: string }
) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("workouts")
    .update({ workout_date: input.date, focus: input.focus })
    .eq("id", workoutId);
  if (error) throw new Error(error.message);
  revalidatePath(`/workouts/${workoutId}`);
  revalidatePath("/");
}

export async function addExercise(
  workoutId: string,
  input: { name: string; sets: SetInput[]; notes?: string }
) {
  const { supabase } = await requireUser();

  const { count } = await supabase
    .from("exercises")
    .select("*", { count: "exact", head: true })
    .eq("workout_id", workoutId);

  const { data: exercise, error: exerciseError } = await insertExerciseRow(supabase, {
    workout_id: workoutId,
    name: input.name,
    position: count ?? 0,
    notes: input.notes || null,
  });

  if (exerciseError) throw new Error(exerciseError.message);

  if (input.sets.length > 0) {
    const { error: setsError } = await supabase.from("sets").insert(
      input.sets.map((s, idx) => ({
        exercise_id: exercise.id,
        set_number: idx + 1,
        reps: s.reps,
        weight: s.weight,
        weight_unit: s.weightUnit,
      }))
    );
    if (setsError) throw new Error(setsError.message);
  }

  revalidatePath(`/workouts/${workoutId}`);
}

export async function updateExerciseNotes(
  workoutId: string,
  exerciseId: string,
  notes: string
) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("exercises")
    .update({ notes: notes || null })
    .eq("id", exerciseId);
  if (error && !isMissingNotesColumn(error.message)) throw new Error(error.message);
  revalidatePath(`/workouts/${workoutId}`);
}

export async function deleteExercise(workoutId: string, exerciseId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("exercises").delete().eq("id", exerciseId);
  if (error) throw new Error(error.message);
  revalidatePath(`/workouts/${workoutId}`);
}

export async function updateSet(
  workoutId: string,
  setId: string,
  input: SetInput
) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("sets")
    .update({ reps: input.reps, weight: input.weight, weight_unit: input.weightUnit })
    .eq("id", setId);
  if (error) throw new Error(error.message);
  revalidatePath(`/workouts/${workoutId}`);
}

export async function deleteSet(workoutId: string, setId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("sets").delete().eq("id", setId);
  if (error) throw new Error(error.message);
  revalidatePath(`/workouts/${workoutId}`);
}

export async function addSet(
  workoutId: string,
  exerciseId: string,
  input: SetInput
) {
  const { supabase } = await requireUser();

  const { count } = await supabase
    .from("sets")
    .select("*", { count: "exact", head: true })
    .eq("exercise_id", exerciseId);

  const { error } = await supabase.from("sets").insert({
    exercise_id: exerciseId,
    set_number: (count ?? 0) + 1,
    reps: input.reps,
    weight: input.weight,
    weight_unit: input.weightUnit,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/workouts/${workoutId}`);
}
