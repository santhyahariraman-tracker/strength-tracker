"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addExercise,
  addSet,
  deleteExercise,
  deleteSet,
  deleteWorkout,
  updateSet,
  updateWorkout,
} from "@/app/actions";
import { ExerciseFormFields, emptySet, type ExerciseDraft } from "@/components/ExerciseForm";

type SetRow = {
  id: string;
  set_number: number;
  reps: number;
  weight: number;
  weight_unit: "lbs" | "kg";
};

type ExerciseRow = {
  id: string;
  name: string;
  position: number;
  sets: SetRow[];
};

export function WorkoutDetail({
  workout,
  exercises,
  exerciseSuggestions,
}: {
  workout: { id: string; date: string; focus: string };
  exercises: ExerciseRow[];
  exerciseSuggestions: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState(workout.date);
  const [focus, setFocus] = useState(workout.focus);
  const [headerSaved, setHeaderSaved] = useState(true);

  const [addingExercise, setAddingExercise] = useState(false);
  const [draft, setDraft] = useState<ExerciseDraft>({ name: "", sets: [emptySet()] });
  const [error, setError] = useState<string | null>(null);

  function saveHeader() {
    startTransition(async () => {
      try {
        await updateWorkout(workout.id, { date, focus: focus.trim() });
        setHeaderSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  async function handleDeleteWorkout() {
    if (!confirm("Delete this entire workout? This cannot be undone.")) return;
    startTransition(async () => {
      try {
        await deleteWorkout(workout.id);
        router.push("/");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  async function handleAddExercise() {
    setError(null);
    const name = draft.name.trim();
    const sets = draft.sets.filter((s) => s.reps > 0 || s.weight > 0);
    if (!name) {
      setError("Enter an exercise name.");
      return;
    }
    startTransition(async () => {
      try {
        await addExercise(workout.id, { name, sets });
        setDraft({ name: "", sets: [emptySet()] });
        setAddingExercise(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add exercise");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-sm text-text-muted underline"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleDeleteWorkout}
          className="text-sm text-danger underline"
        >
          Delete workout
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setHeaderSaved(false);
            }}
            onBlur={saveHeader}
            className="border rounded-lg px-3 py-2.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Focus
          <input
            value={focus}
            onChange={(e) => {
              setFocus(e.target.value);
              setHeaderSaved(false);
            }}
            onBlur={saveHeader}
            className="border rounded-lg px-3 py-2.5"
          />
        </label>
      </div>
      {!headerSaved && !isPending && (
        <p className="text-xs text-text-muted -mt-3">Saving…</p>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-col gap-4">
        {exercises.map((ex) => (
          <ExerciseCard key={ex.id} workoutId={workout.id} exercise={ex} />
        ))}
      </div>

      {addingExercise ? (
        <div className="flex flex-col gap-3">
          <ExerciseFormFields
            exercise={draft}
            onChange={setDraft}
            exerciseSuggestions={exerciseSuggestions}
          />
          <div className="flex gap-4 items-center">
            <button
              type="button"
              onClick={handleAddExercise}
              disabled={isPending}
              className="bg-gradient-to-r from-accent-purple to-accent-purple-2 text-white rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              Save exercise
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingExercise(false);
                setDraft({ name: "", sets: [emptySet()] });
              }}
              className="text-sm text-text-muted underline"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingExercise(true)}
          className="text-sm text-accent-orange font-medium self-start"
        >
          + Add exercise
        </button>
      )}
    </div>
  );
}

function ExerciseCard({
  workoutId,
  exercise,
}: {
  workoutId: string;
  exercise: ExerciseRow;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newSet, setNewSet] = useState(emptySet());
  const [adding, setAdding] = useState(false);

  function handleDeleteExercise() {
    if (!confirm(`Remove ${exercise.name} and all its sets?`)) return;
    startTransition(async () => {
      await deleteExercise(workoutId, exercise.id);
      router.refresh();
    });
  }

  function handleSetChange(setId: string, patch: Partial<SetRow>) {
    startTransition(async () => {
      await updateSet(workoutId, setId, {
        reps: patch.reps ?? 0,
        weight: patch.weight ?? 0,
        weightUnit: (patch.weight_unit ?? "lbs") as "lbs" | "kg",
      });
    });
  }

  function handleDeleteSet(setId: string) {
    startTransition(async () => {
      await deleteSet(workoutId, setId);
      router.refresh();
    });
  }

  function handleAddSet() {
    if (newSet.reps <= 0 && newSet.weight <= 0) return;
    startTransition(async () => {
      await addSet(workoutId, exercise.id, newSet);
      setNewSet(emptySet(newSet.weightUnit));
      setAdding(false);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{exercise.name}</h3>
        <button
          type="button"
          onClick={handleDeleteExercise}
          className="text-sm text-danger"
        >
          Remove
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {exercise.sets.map((set) => (
          <div key={set.id} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Set {set.set_number}</span>
              <button
                type="button"
                onClick={() => handleDeleteSet(set.id)}
                className="text-text-muted text-xs"
                disabled={isPending}
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                min={0}
                defaultValue={set.reps}
                onBlur={(e) => handleSetChange(set.id, { reps: Number(e.target.value) })}
                className="border rounded-lg px-2 py-2 text-sm min-w-0 w-full"
              />
              <input
                type="number"
                min={0}
                step="0.5"
                defaultValue={set.weight}
                onBlur={(e) => handleSetChange(set.id, { weight: Number(e.target.value) })}
                className="border rounded-lg px-2 py-2 text-sm min-w-0 w-full"
              />
              <select
                defaultValue={set.weight_unit}
                onChange={(e) =>
                  handleSetChange(set.id, { weight_unit: e.target.value as "lbs" | "kg" })
                }
                className="border rounded-lg px-2 py-2 text-sm min-w-0 w-full"
              >
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-text-muted">Set {exercise.sets.length + 1}</span>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              min={0}
              placeholder="Reps"
              value={newSet.reps || ""}
              onChange={(e) => setNewSet({ ...newSet, reps: Number(e.target.value) })}
              className="border rounded-lg px-2 py-2 text-sm min-w-0 w-full"
            />
            <input
              type="number"
              min={0}
              step="0.5"
              placeholder="Weight"
              value={newSet.weight || ""}
              onChange={(e) => setNewSet({ ...newSet, weight: Number(e.target.value) })}
              className="border rounded-lg px-2 py-2 text-sm min-w-0 w-full"
            />
            <select
              value={newSet.weightUnit}
              onChange={(e) =>
                setNewSet({ ...newSet, weightUnit: e.target.value as "lbs" | "kg" })
              }
              className="border rounded-lg px-2 py-2 text-sm min-w-0 w-full"
            >
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleAddSet}
            className="text-sm text-accent-orange font-medium self-start mt-1"
            disabled={isPending}
          >
            Add set
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-sm text-accent-orange font-medium self-start"
        >
          + Add set
        </button>
      )}
    </div>
  );
}
