"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createWorkout } from "@/app/actions";
import {
  ExerciseFormFields,
  emptySet,
  type ExerciseDraft,
} from "@/components/ExerciseForm";

function todayLocalISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export default function NewWorkoutPage() {
  const router = useRouter();
  const supabase = createClient();

  const [date, setDate] = useState(todayLocalISO());
  const [focus, setFocus] = useState("");
  const [exercises, setExercises] = useState<ExerciseDraft[]>([
    { name: "", sets: [emptySet()] },
  ]);
  const [focusSuggestions, setFocusSuggestions] = useState<string[]>([]);
  const [exerciseSuggestions, setExerciseSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: workouts } = await supabase.from("workouts").select("focus");
      if (workouts) {
        setFocusSuggestions([...new Set(workouts.map((w) => w.focus))]);
      }
      const { data: exs } = await supabase.from("exercises").select("name");
      if (exs) {
        setExerciseSuggestions([...new Set(exs.map((e) => e.name))]);
      }
    })();
  }, [supabase]);

  function updateExercise(idx: number, next: ExerciseDraft) {
    setExercises(exercises.map((e, i) => (i === idx ? next : e)));
  }

  function addExerciseRow() {
    setExercises([...exercises, { name: "", sets: [emptySet()] }]);
  }

  function removeExerciseRow(idx: number) {
    setExercises(exercises.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanExercises = exercises
      .filter((ex) => ex.name.trim())
      .map((ex) => ({
        name: ex.name.trim(),
        sets: ex.sets.filter((s) => s.reps > 0 || s.weight > 0),
      }));

    if (cleanExercises.length === 0) {
      setError("Add at least one exercise.");
      return;
    }

    setSaving(true);
    try {
      await createWorkout({ date, focus: focus.trim(), exercises: cleanExercises });
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">New workout</h1>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-sm text-neutral-500 underline"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex flex-col gap-1 text-sm flex-1">
            Date
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border rounded-md px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm flex-1">
            Focus
            <input
              list="focus-suggestions"
              required
              placeholder="e.g. Push Day, Legs, Back & Biceps"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              className="border rounded-md px-3 py-2"
            />
            <datalist id="focus-suggestions">
              {focusSuggestions.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-neutral-600">Exercises</h2>
          {exercises.map((ex, idx) => (
            <ExerciseFormFields
              key={idx}
              exercise={ex}
              onChange={(next) => updateExercise(idx, next)}
              onRemove={exercises.length > 1 ? () => removeExerciseRow(idx) : undefined}
              exerciseSuggestions={exerciseSuggestions}
            />
          ))}
          <button
            type="button"
            onClick={addExerciseRow}
            className="text-sm text-neutral-700 underline self-start"
          >
            + Add exercise
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-neutral-900 text-white rounded-md py-2 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save workout"}
        </button>
      </form>
    </div>
  );
}
