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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-sm text-neutral-500 underline"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleDeleteWorkout}
          className="text-sm text-red-600 underline"
        >
          Delete workout
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <label className="flex flex-col gap-1 text-sm flex-1">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setHeaderSaved(false);
            }}
            onBlur={saveHeader}
            className="border rounded-md px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm flex-1">
          Focus
          <input
            value={focus}
            onChange={(e) => {
              setFocus(e.target.value);
              setHeaderSaved(false);
            }}
            onBlur={saveHeader}
            className="border rounded-md px-3 py-2"
          />
        </label>
      </div>
      {!headerSaved && !isPending && (
        <p className="text-xs text-neutral-400 -mt-4">Saving on blur…</p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

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
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleAddExercise}
              disabled={isPending}
              className="bg-neutral-900 text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Save exercise
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingExercise(false);
                setDraft({ name: "", sets: [emptySet()] });
              }}
              className="text-sm text-neutral-500 underline"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingExercise(true)}
          className="text-sm text-neutral-700 underline self-start"
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
    <div className="border rounded-md p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{exercise.name}</h3>
        <button
          type="button"
          onClick={handleDeleteExercise}
          className="text-sm text-red-600"
        >
          Remove
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {exercise.sets.map((set) => (
          <div key={set.id} className="flex items-center gap-2 text-sm">
            <span className="text-neutral-400 w-14">Set {set.set_number}</span>
            <input
              type="number"
              min={0}
              defaultValue={set.reps}
              onBlur={(e) => handleSetChange(set.id, { reps: Number(e.target.value) })}
              className="border rounded-md px-2 py-1 w-20"
            />
            <span className="text-neutral-400">reps</span>
            <input
              type="number"
              min={0}
              step="0.5"
              defaultValue={set.weight}
              onBlur={(e) => handleSetChange(set.id, { weight: Number(e.target.value) })}
              className="border rounded-md px-2 py-1 w-24"
            />
            <select
              defaultValue={set.weight_unit}
              onChange={(e) =>
                handleSetChange(set.id, { weight_unit: e.target.value as "lbs" | "kg" })
              }
              className="border rounded-md px-2 py-1"
            >
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
            <button
              type="button"
              onClick={() => handleDeleteSet(set.id)}
              className="text-neutral-400 hover:text-red-600 text-xs ml-1"
              disabled={isPending}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-neutral-400 w-14">Set {exercise.sets.length + 1}</span>
          <input
            type="number"
            min={0}
            placeholder="Reps"
            value={newSet.reps || ""}
            onChange={(e) => setNewSet({ ...newSet, reps: Number(e.target.value) })}
            className="border rounded-md px-2 py-1 w-20"
          />
          <span className="text-neutral-400">reps</span>
          <input
            type="number"
            min={0}
            step="0.5"
            placeholder="Weight"
            value={newSet.weight || ""}
            onChange={(e) => setNewSet({ ...newSet, weight: Number(e.target.value) })}
            className="border rounded-md px-2 py-1 w-24"
          />
          <select
            value={newSet.weightUnit}
            onChange={(e) =>
              setNewSet({ ...newSet, weightUnit: e.target.value as "lbs" | "kg" })
            }
            className="border rounded-md px-2 py-1"
          >
            <option value="lbs">lbs</option>
            <option value="kg">kg</option>
          </select>
          <button
            type="button"
            onClick={handleAddSet}
            className="text-sm underline"
            disabled={isPending}
          >
            Add
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-sm text-neutral-600 underline self-start"
        >
          + Add set
        </button>
      )}
    </div>
  );
}
