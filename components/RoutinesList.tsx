"use client";

import { useState } from "react";
import { RoutineEditor, DAY_NAMES, type RoutineDraft } from "@/components/RoutineEditor";

type SavedRoutine = {
  id: string;
  dayOfWeek: number;
  focus: string;
  items: { exerciseName: string; targetSets: number; targetReps: number }[];
};

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

  const byDay = [...routines].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const usedDays = new Set(routines.map((r) => r.dayOfWeek));
  const nextOpenDay = DAY_NAMES.findIndex((_, idx) => !usedDays.has(idx));

  return (
    <div className="flex flex-col gap-3">
      {routines.length === 0 && (
        <p className="text-sm text-text-muted">
          No routines yet. Set one up per day of the week — whichever day it is,
          that routine auto-fills as your goal.
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        {byDay.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() =>
              setEditing({ id: r.id, dayOfWeek: r.dayOfWeek, focus: r.focus, items: r.items })
            }
            className="text-left rounded-xl border border-border bg-surface px-4 py-3 active:bg-surface-2"
          >
            <p className="font-medium">
              {DAY_NAMES[r.dayOfWeek]} — {r.focus}
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              {r.items
                .map((it) => `${it.exerciseName} (${it.targetSets}×${it.targetReps})`)
                .join(", ")}
            </p>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          setEditing({
            dayOfWeek: nextOpenDay === -1 ? 0 : nextOpenDay,
            focus: "",
            items: [],
          })
        }
        className="text-sm text-accent-orange font-medium self-start"
      >
        + New routine
      </button>
    </div>
  );
}
