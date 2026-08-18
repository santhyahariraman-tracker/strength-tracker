"use client";

import { useState } from "react";
import type { SetInput } from "@/app/actions";

export type ExerciseDraft = {
  name: string;
  sets: SetInput[];
  notes?: string;
};

export function emptySet(unit: "lbs" | "kg" = "lbs"): SetInput {
  return { reps: 0, weight: 0, weightUnit: unit };
}

export function ExerciseFormFields({
  exercise,
  onChange,
  onRemove,
  exerciseSuggestions,
}: {
  exercise: ExerciseDraft;
  onChange: (next: ExerciseDraft) => void;
  onRemove?: () => void;
  exerciseSuggestions: string[];
}) {
  const [setCountInput, setSetCountInput] = useState(String(exercise.sets.length || ""));

  function updateSetCount(value: string) {
    setSetCountInput(value);
    const n = Math.max(0, Math.min(50, parseInt(value, 10) || 0));
    const lastUnit = exercise.sets[exercise.sets.length - 1]?.weightUnit ?? "lbs";
    const sets = Array.from({ length: n }, (_, i) => exercise.sets[i] ?? emptySet(lastUnit));
    onChange({ ...exercise, sets });
  }

  function updateSet(idx: number, patch: Partial<SetInput>) {
    const sets = exercise.sets.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange({ ...exercise, sets });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <input
          list="exercise-suggestions"
          required
          placeholder="Exercise name, e.g. Lat Pulldown"
          value={exercise.name}
          onChange={(e) => onChange({ ...exercise, name: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-0"
        />
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm text-danger px-2 py-2 shrink-0"
          >
            Remove
          </button>
        )}
      </div>
      <datalist id="exercise-suggestions">
        {exerciseSuggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <label className="text-sm text-text-muted flex items-center gap-2">
        Number of sets
        <input
          type="number"
          min={0}
          max={50}
          value={setCountInput}
          onChange={(e) => updateSetCount(e.target.value)}
          className="border rounded-lg px-2 py-1 text-sm w-16"
        />
      </label>

      {exercise.sets.length > 0 && (
        <div className="flex flex-col gap-3">
          {exercise.sets.map((set, idx) => (
            <div key={idx} className="flex flex-col gap-1.5">
              <span className="text-xs text-text-muted">Set {idx + 1}</span>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder="Reps"
                  value={set.reps || ""}
                  onChange={(e) => updateSet(idx, { reps: Number(e.target.value) })}
                  className="border rounded-lg px-2 py-2 text-sm min-w-0 w-full"
                />
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  placeholder="Weight"
                  value={set.weight || ""}
                  onChange={(e) => updateSet(idx, { weight: Number(e.target.value) })}
                  className="border rounded-lg px-2 py-2 text-sm min-w-0 w-full"
                />
                <select
                  value={set.weightUnit}
                  onChange={(e) =>
                    updateSet(idx, { weightUnit: e.target.value as "lbs" | "kg" })
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
      )}

      <textarea
        placeholder="Notes (optional) — e.g. felt heavy today"
        value={exercise.notes ?? ""}
        onChange={(e) => onChange({ ...exercise, notes: e.target.value })}
        rows={2}
        className="border rounded-lg px-3 py-2 text-sm resize-none"
      />
    </div>
  );
}
