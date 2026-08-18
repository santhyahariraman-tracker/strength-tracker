"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { completeGoalItem } from "@/app/actions";
import { exerciseEmoji } from "@/lib/exerciseEmoji";

type GoalItem = {
  id: string;
  exerciseName: string;
  targetSets: number;
  targetReps: number;
  exerciseId: string | null;
};

type Suggestion = { weight: number; unit: "lbs" | "kg" } | null;

export function DailyGoalCard({
  goalId,
  items,
  suggestions,
  alreadyComplete,
}: {
  goalId: string;
  items: GoalItem[];
  suggestions: Record<string, Suggestion>;
  alreadyComplete: boolean;
}) {
  const router = useRouter();
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [reps, setReps] = useState(0);
  const [weight, setWeight] = useState(0);
  const [unit, setUnit] = useState<"lbs" | "kg">("lbs");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completedCount = items.filter((it) => it.exerciseId).length;

  function openItem(item: GoalItem) {
    const suggestion = suggestions[item.exerciseName];
    setReps(item.targetReps);
    setWeight(suggestion?.weight ?? 0);
    setUnit(suggestion?.unit ?? "lbs");
    setOpenItemId(item.id);
    setError(null);
  }

  async function handleComplete(item: GoalItem) {
    if (reps <= 0 && weight <= 0) {
      setError("Enter reps and weight.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await completeGoalItem(goalId, item.id, item.exerciseName, item.targetSets, {
        reps,
        weight,
        weightUnit: unit,
      });
      setOpenItemId(null);
      setSaving(false);
      if (result.allComplete && !alreadyComplete) {
        confetti({
          particleCount: 140,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#6c5ce7", "#d97a2e", "#f3f1fb"],
        });
      }
      router.refresh();
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Failed to log");
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Today&apos;s goal</p>
        <p className="text-xs text-text-muted">
          {completedCount}/{items.length} done
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const done = !!item.exerciseId;
          const isOpen = openItemId === item.id;
          return (
            <div key={item.id} className="rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => (done ? undefined : isOpen ? setOpenItemId(null) : openItem(item))}
                disabled={done}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left disabled:opacity-70"
              >
                <span className="text-lg">{exerciseEmoji(item.exerciseName)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.exerciseName}</p>
                  <p className="text-xs text-text-muted">
                    Target: {item.targetSets} × {item.targetReps} reps
                  </p>
                </div>
                {done ? (
                  <span className="text-accent-orange text-lg">✓</span>
                ) : (
                  <span className="text-text-muted text-xs">Log</span>
                )}
              </button>

              {isOpen && !done && (
                <div className="px-3 pb-3 flex flex-col gap-2 border-t border-border pt-2">
                  {suggestions[item.exerciseName] && (
                    <p className="text-xs text-text-muted">
                      Suggested: {suggestions[item.exerciseName]!.weight}{" "}
                      {suggestions[item.exerciseName]!.unit}
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      min={0}
                      placeholder="Reps"
                      value={reps || ""}
                      onChange={(e) => setReps(Number(e.target.value))}
                      className="border rounded-lg px-2 py-2 text-sm min-w-0 w-full"
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      placeholder="Weight"
                      value={weight || ""}
                      onChange={(e) => setWeight(Number(e.target.value))}
                      className="border rounded-lg px-2 py-2 text-sm min-w-0 w-full"
                    />
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as "lbs" | "kg")}
                      className="border rounded-lg px-2 py-2 text-sm min-w-0 w-full"
                    >
                      <option value="lbs">lbs</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleComplete(item)}
                    disabled={saving}
                    className="bg-gradient-to-r from-accent-purple to-accent-purple-2 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Mark complete"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
