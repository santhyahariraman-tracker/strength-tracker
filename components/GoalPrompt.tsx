"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setDailyGoal, type RoutineItemInput } from "@/app/actions";
import { DAY_NAMES } from "@/components/RoutineEditor";

type Routine = {
  id: string;
  dayOfWeek: number;
  focus: string;
  items: RoutineItemInput[];
};

export function GoalPrompt({
  date,
  todayRoutine,
  routines,
  exerciseSuggestions,
}: {
  date: string;
  todayRoutine: Routine | null;
  routines: Routine[];
  exerciseSuggestions: string[];
}) {
  const router = useRouter();
  const [focus, setFocus] = useState(todayRoutine?.focus ?? "");
  const [items, setItems] = useState<RoutineItemInput[]>(
    todayRoutine?.items.length ? todayRoutine.items : [{ exerciseName: "", targetSets: 1, targetReps: 0 }]
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(true);

  function loadRoutine(routineId: string) {
    const routine = routines.find((r) => r.id === routineId);
    if (!routine) return;
    setFocus(routine.focus);
    setItems(
      routine.items.length > 0 ? routine.items : [{ exerciseName: "", targetSets: 1, targetReps: 0 }]
    );
  }

  function updateItem(idx: number, patch: Partial<RoutineItemInput>) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems([...items, { exerciseName: "", targetSets: 1, targetReps: 0 }]);
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setError(null);
    const cleanItems = items
      .filter((it) => it.exerciseName.trim())
      .map((it) => ({
        exerciseName: it.exerciseName.trim(),
        targetSets: it.targetSets || 1,
        targetReps: it.targetReps || 0,
      }));

    if (cleanItems.length === 0) {
      setError("Add at least one exercise.");
      return;
    }

    setSaving(true);
    try {
      await setDailyGoal(date, focus.trim() || "Workout", cleanItems);
      router.refresh();
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Failed to save goal");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-text-muted text-left"
      >
        + Set today&apos;s goal
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
      <p className="text-sm font-medium">
        {todayRoutine ? "Today's routine" : "Set today's goal"}
      </p>

      {routines.length > 0 && (
        <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) loadRoutine(e.target.value);
            e.target.value = "";
          }}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Load a different day&apos;s routine…
          </option>
          {routines.map((r) => (
            <option key={r.id} value={r.id}>
              {DAY_NAMES[r.dayOfWeek]} — {r.focus}
            </option>
          ))}
        </select>
      )}

      <input
        placeholder="Focus, e.g. Push Day"
        value={focus}
        onChange={(e) => setFocus(e.target.value)}
        className="border rounded-lg px-3 py-2 text-sm"
      />

      <div className="flex flex-col gap-2">
        {items.map((it, idx) => (
          <div key={idx} className="flex flex-col gap-1.5">
            <input
              list="goal-exercise-suggestions"
              placeholder="Exercise name"
              value={it.exerciseName}
              onChange={(e) => updateItem(idx, { exerciseName: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                placeholder="Sets"
                value={it.targetSets || ""}
                onChange={(e) => updateItem(idx, { targetSets: Number(e.target.value) })}
                className="border rounded-lg px-2 py-2 text-sm w-20"
              />
              <span className="text-xs text-text-muted">sets ×</span>
              <input
                type="number"
                min={0}
                placeholder="Reps"
                value={it.targetReps || ""}
                onChange={(e) => updateItem(idx, { targetReps: Number(e.target.value) })}
                className="border rounded-lg px-2 py-2 text-sm w-20"
              />
              <span className="text-xs text-text-muted">reps</span>
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(idx)} className="text-sm text-danger shrink-0 ml-auto">
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
        <datalist id="goal-exercise-suggestions">
          {exerciseSuggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>

      <button type="button" onClick={addItem} className="text-sm text-accent-orange font-medium self-start">
        + Add exercise
      </button>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="bg-gradient-to-r from-accent-purple to-accent-purple-2 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save goal"}
      </button>
    </div>
  );
}
