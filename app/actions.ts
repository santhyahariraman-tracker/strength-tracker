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

export type RoutineItemInput = { exerciseName: string; targetSets: number; targetReps: number };

export async function createRoutine(
  dayOfWeek: number,
  focus: string,
  items: RoutineItemInput[]
) {
  const { supabase, user } = await requireUser();

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .insert({ user_id: user.id, day_of_week: dayOfWeek, focus })
    .select()
    .single();
  if (routineError) throw new Error(routineError.message);

  if (items.length > 0) {
    const { error: itemsError } = await supabase.from("routine_exercises").insert(
      items.map((it, idx) => ({
        routine_id: routine.id,
        exercise_name: it.exerciseName,
        target_sets: it.targetSets,
        target_reps: it.targetReps,
        position: idx,
      }))
    );
    if (itemsError) throw new Error(itemsError.message);
  }

  revalidatePath("/routines");
  revalidatePath("/");
  return { id: routine.id as string };
}

export async function updateRoutine(
  routineId: string,
  dayOfWeek: number,
  focus: string,
  items: RoutineItemInput[]
) {
  const { supabase } = await requireUser();

  const { error: updateError } = await supabase
    .from("routines")
    .update({ day_of_week: dayOfWeek, focus })
    .eq("id", routineId);
  if (updateError) throw new Error(updateError.message);

  const { error: deleteError } = await supabase
    .from("routine_exercises")
    .delete()
    .eq("routine_id", routineId);
  if (deleteError) throw new Error(deleteError.message);

  if (items.length > 0) {
    const { error: itemsError } = await supabase.from("routine_exercises").insert(
      items.map((it, idx) => ({
        routine_id: routineId,
        exercise_name: it.exerciseName,
        target_sets: it.targetSets,
        target_reps: it.targetReps,
        position: idx,
      }))
    );
    if (itemsError) throw new Error(itemsError.message);
  }

  revalidatePath("/routines");
  revalidatePath("/");
}

export async function deleteRoutine(routineId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("routines").delete().eq("id", routineId);
  if (error) throw new Error(error.message);
  revalidatePath("/routines");
}

export async function setDailyGoal(
  date: string,
  focus: string,
  items: RoutineItemInput[]
) {
  const { supabase, user } = await requireUser();

  const { data: goal, error: goalError } = await supabase
    .from("daily_goals")
    .insert({ user_id: user.id, goal_date: date, focus: focus || "Workout" })
    .select()
    .single();
  if (goalError) throw new Error(goalError.message);

  if (items.length > 0) {
    const { error: itemsError } = await supabase.from("goal_items").insert(
      items.map((it) => ({
        goal_id: goal.id,
        exercise_name: it.exerciseName,
        target_sets: it.targetSets,
        target_reps: it.targetReps,
      }))
    );
    if (itemsError) throw new Error(itemsError.message);
  }

  revalidatePath("/");
  return { id: goal.id as string };
}

export async function logGoalSet(
  goalId: string,
  itemId: string,
  exerciseName: string,
  targetSets: number,
  setNumber: number,
  input: SetInput
) {
  const { supabase, user } = await requireUser();

  const { data: goal, error: goalFetchError } = await supabase
    .from("daily_goals")
    .select("goal_date, focus")
    .eq("id", goalId)
    .single();
  if (goalFetchError) throw new Error(goalFetchError.message);

  let { data: workout } = await supabase
    .from("workouts")
    .select("id")
    .eq("user_id", user.id)
    .eq("workout_date", goal.goal_date)
    .limit(1)
    .maybeSingle();

  if (!workout) {
    const { data: newWorkout, error: workoutError } = await supabase
      .from("workouts")
      .insert({ user_id: user.id, workout_date: goal.goal_date, focus: goal.focus })
      .select()
      .single();
    if (workoutError) throw new Error(workoutError.message);
    workout = newWorkout;
  }
  if (!workout) throw new Error("Failed to find or create today's workout");

  const { data: existingItem, error: itemFetchError } = await supabase
    .from("goal_items")
    .select("exercise_id")
    .eq("id", itemId)
    .single();
  if (itemFetchError) throw new Error(itemFetchError.message);

  let exerciseId = existingItem.exercise_id as string | null;
  if (!exerciseId) {
    const { count: existingCount } = await supabase
      .from("exercises")
      .select("*", { count: "exact", head: true })
      .eq("workout_id", workout.id);

    const { data: exercise, error: exerciseError } = await insertExerciseRow(supabase, {
      workout_id: workout.id,
      name: exerciseName,
      position: existingCount ?? 0,
      notes: null,
    });
    if (exerciseError) throw new Error(exerciseError.message);
    exerciseId = exercise.id as string;

    const { error: itemUpdateError } = await supabase
      .from("goal_items")
      .update({ exercise_id: exerciseId })
      .eq("id", itemId);
    if (itemUpdateError) throw new Error(itemUpdateError.message);
  }

  const { data: existingSet } = await supabase
    .from("sets")
    .select("id")
    .eq("exercise_id", exerciseId)
    .eq("set_number", setNumber)
    .maybeSingle();

  if (existingSet) {
    const { error: updateError } = await supabase
      .from("sets")
      .update({ reps: input.reps, weight: input.weight, weight_unit: input.weightUnit })
      .eq("id", existingSet.id);
    if (updateError) throw new Error(updateError.message);
  } else {
    const { error: insertError } = await supabase.from("sets").insert({
      exercise_id: exerciseId,
      set_number: setNumber,
      reps: input.reps,
      weight: input.weight,
      weight_unit: input.weightUnit,
    });
    if (insertError) throw new Error(insertError.message);
  }

  const { count: loggedCount } = await supabase
    .from("sets")
    .select("*", { count: "exact", head: true })
    .eq("exercise_id", exerciseId);
  const itemDone = (loggedCount ?? 0) >= targetSets;

  const { data: allItems } = await supabase
    .from("goal_items")
    .select("id, target_sets, exercise_id")
    .eq("goal_id", goalId);

  let allComplete = false;
  if (allItems && allItems.length > 0) {
    const exerciseIds = allItems
      .filter((it) => it.exercise_id)
      .map((it) => it.exercise_id as string);
    const { data: allSets } = exerciseIds.length
      ? await supabase.from("sets").select("exercise_id").in("exercise_id", exerciseIds)
      : { data: [] as { exercise_id: string }[] };
    const countsByExercise = new Map<string, number>();
    for (const s of allSets ?? []) {
      countsByExercise.set(s.exercise_id, (countsByExercise.get(s.exercise_id) ?? 0) + 1);
    }
    allComplete = allItems.every(
      (it) => it.exercise_id && (countsByExercise.get(it.exercise_id) ?? 0) >= it.target_sets
    );
  }

  if (allComplete) {
    await supabase
      .from("daily_goals")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", goalId);
  }

  revalidatePath("/");
  revalidatePath(`/workouts/${workout.id}`);
  return { itemDone, allComplete, workoutId: workout.id as string };
}

export async function updateGoalSet(setId: string, input: SetInput) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("sets")
    .update({ reps: input.reps, weight: input.weight, weight_unit: input.weightUnit })
    .eq("id", setId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
