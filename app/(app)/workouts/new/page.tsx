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
        notes: ex.notes?.trim() || undefined,
      }));

    if (cleanExercises.length === 0) {
      setError("Add at least one exercise.");
      return;
    }

    setSaving(true);
    try {
      const { id } = await createWorkout({
        date,
        focus: focus.trim(),
        exercises: cleanExercises,
      });
      router.push(`/workouts/${id}`);
      router.refresh();
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">New workout</h1>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-sm text-text-muted underline"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Date
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border rounded-lg px-3 py-2.5"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Focus
            <input
              list="focus-suggestions"
              required
              placeholder="e.g. Push Day, Legs, Back & Biceps"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              className="border rounded-lg px-3 py-2.5"
            />
            <datalist id="focus-suggestions">
              {focusSuggestions.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold tracking-widest text-text-muted uppercase">
            Exercises
          </h2>
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
            className="text-sm text-accent-orange font-medium self-start"
          >
            + Add exercise
          </button>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-gradient-to-r from-accent-purple to-accent-purple-2 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save workout"}
        </button>
      </form>
    </div>
  );
}
