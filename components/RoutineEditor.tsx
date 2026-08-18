"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRoutine, deleteRoutine, updateRoutine, type RoutineItemInput } from "@/app/actions";

export type RoutineDraft = {
  id?: string;
  name: string;
  items: RoutineItemInput[];
};

export function emptyRoutineItem(): RoutineItemInput {
  return { exerciseName: "", targetReps: 0 };
}

export function RoutineEditor({
  initial,
  exerciseSuggestions,
  onDone,
}: {
  initial: RoutineDraft;
  exerciseSuggestions: string[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [items, setItems] = useState<RoutineItemInput[]>(
    initial.items.length > 0 ? initial.items : [emptyRoutineItem()]
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateItem(idx: number, patch: Partial<RoutineItemInput>) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems([...items, emptyRoutineItem()]);
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setError(null);
    const cleanName = name.trim();
    const cleanItems = items
      .filter((it) => it.exerciseName.trim())
      .map((it) => ({ exerciseName: it.exerciseName.trim(), targetReps: it.targetReps || 0 }));

    if (!cleanName) {
      setError("Give this routine a name.");
      return;
    }
    if (cleanItems.length === 0) {
      setError("Add at least one exercise.");
      return;
    }

    setSaving(true);
    try {
      if (initial.id) {
        await updateRoutine(initial.id, cleanName, cleanItems);
      } else {
        await createRoutine(cleanName, cleanItems);
      }
      router.refresh();
      onDone();
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Failed to save routine");
    }
  }

  async function handleDelete() {
    if (!initial.id) return;
    if (!confirm(`Delete routine "${initial.name}"?`)) return;
    setSaving(true);
    try {
      await deleteRoutine(initial.id);
      router.refresh();
      onDone();
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Failed to delete routine");
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
      <input
        placeholder="Routine name, e.g. Push Day A"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border rounded-lg px-3 py-2 text-sm"
      />

      <div className="flex flex-col gap-3">
        {items.map((it, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              list="routine-exercise-suggestions"
              placeholder="Exercise name"
              value={it.exerciseName}
              onChange={(e) => updateItem(idx, { exerciseName: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-0"
            />
            <input
              type="number"
              min={0}
              placeholder="Reps"
              value={it.targetReps || ""}
              onChange={(e) => updateItem(idx, { targetReps: Number(e.target.value) })}
              className="border rounded-lg px-2 py-2 text-sm w-20"
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-sm text-danger shrink-0"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <datalist id="routine-exercise-suggestions">
          {exerciseSuggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>

      <button
        type="button"
        onClick={addItem}
        className="text-sm text-accent-orange font-medium self-start"
      >
        + Add exercise
      </button>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-accent-purple to-accent-purple-2 text-white rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          Save routine
        </button>
        <button type="button" onClick={onDone} className="text-sm text-text-muted underline">
          Cancel
        </button>
        {initial.id && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="text-sm text-danger underline ml-auto"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
