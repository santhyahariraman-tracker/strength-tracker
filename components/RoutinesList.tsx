"use client";

import { useState } from "react";
import { RoutineEditor, type RoutineDraft } from "@/components/RoutineEditor";

type SavedRoutine = { id: string; name: string; items: { exerciseName: string; targetReps: number }[] };

export function RoutinesList({
  routines,
  exerciseSuggestions,
}: {
  routines: SavedRoutine[];
  exerciseSuggestions: string[];
}) {
  const [editing, setEditing] = useState<RoutineDraft | null>(null);

  if (editing) {
    return (
      <RoutineEditor
        initial={editing}
        exerciseSuggestions={exerciseSuggestions}
        onDone={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {routines.length === 0 && (
        <p className="text-sm text-text-muted">
          No routines yet. Save one to quickly reuse it for the exercises you repeat
          each week.
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        {routines.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setEditing({ id: r.id, name: r.name, items: r.items })}
            className="text-left rounded-xl border border-border bg-surface px-4 py-3 active:bg-surface-2"
          >
            <p className="font-medium">{r.name}</p>
            <p className="text-xs text-text-muted mt-0.5">
              {r.items.map((it) => it.exerciseName).join(", ")}
            </p>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setEditing({ name: "", items: [] })}
        className="text-sm text-accent-orange font-medium self-start"
      >
        + New routine
      </button>
    </div>
  );
}
