"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import confetti from "canvas-confetti";
import { logGoalSet, updateGoalSet } from "@/app/actions";
import { exerciseEmoji } from "@/lib/exerciseEmoji";

type GoalItem = {
  id: string;
  exerciseName: string;
  targetSets: number;
  targetReps: number;
  exerciseId: string | null;
};

type LoggedSet = {
  id: string;
  setNumber: number;
  reps: number;
  weight: number;
  weightUnit: "lbs" | "kg";
};

type Suggestion = { weight: number; unit: "lbs" | "kg" } | null;

const CONFETTI_COLORS = [
  "#6c5ce7",
  "#d97a2e",
  "#ff5e5e",
  "#ffd93d",
  "#2ecc71",
  "#00d2ff",
  "#ff6fd8",
];

function fireGrandConfetti() {
  const duration = 5000;
  const end = Date.now() + duration;

  // Big opening pop, dead center.
  confetti({
    particleCount: 220,
    spread: 100,
    startVelocity: 55,
    scalar: 1.2,
    origin: { y: 0.55 },
    colors: CONFETTI_COLORS,
  });

  // Continuous bursts from both sides for the full duration.
  (function frame() {
    confetti({
      particleCount: 6,
      angle: 60,
      spread: 65,
      startVelocity: 45,
      origin: { x: 0, y: 0.65 },
      colors: CONFETTI_COLORS,
    });
    confetti({
      particleCount: 6,
      angle: 120,
      spread: 65,
      startVelocity: 45,
      origin: { x: 1, y: 0.65 },
      colors: CONFETTI_COLORS,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();

  // A couple extra bright pops partway through for good measure.
  setTimeout(() => {
    confetti({
      particleCount: 120,
      spread: 120,
      startVelocity: 40,
      scalar: 1.1,
      origin: { y: 0.4 },
      colors: CONFETTI_COLORS,
    });
  }, 1800);
  setTimeout(() => {
    confetti({
      particleCount: 120,
      spread: 120,
      startVelocity: 40,
      scalar: 1.1,
      origin: { y: 0.4 },
      colors: CONFETTI_COLORS,
    });
  }, 3400);
}

export function DailyGoalCard({
  goalId,
  items,
  loggedSetsByExercise,
  suggestions,
  alreadyComplete,
}: {
  goalId: string;
  items: GoalItem[];
  loggedSetsByExercise: Record<string, LoggedSet[]>;
  suggestions: Record<string, Suggestion>;
  alreadyComplete: boolean;
}) {
  const router = useRouter();
  const [openItemId, setOpenItemId] = useState<string | null>(null);

  const itemLoggedCount = (item: GoalItem) =>
    item.exerciseId ? (loggedSetsByExercise[item.exerciseId]?.length ?? 0) : 0;
  const itemDone = (item: GoalItem) => itemLoggedCount(item) >= item.targetSets;

  const completedCount = items.filter(itemDone).length;

  function celebrateIfNeeded(allComplete: boolean) {
    if (allComplete && !alreadyComplete) {
      fireGrandConfetti();
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

      {/* TEMP: confetti test button — remove after testing */}
      <button
        type="button"
        onClick={fireGrandConfetti}
        className="text-xs border border-dashed border-accent-orange text-accent-orange rounded-lg py-1.5 self-start px-3"
      >
        🎉 Test confetti
      </button>

      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const done = itemDone(item);
          const loggedSets = item.exerciseId ? (loggedSetsByExercise[item.exerciseId] ?? []) : [];
          const isOpen = openItemId === item.id;
          return (
            <div key={item.id} className="rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenItemId(isOpen ? null : item.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
              >
                <span className="text-lg">{exerciseEmoji(item.exerciseName)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.exerciseName}</p>
                  <p className="text-xs text-text-muted">
                    {loggedSets.length}/{item.targetSets} sets × {item.targetReps} reps
                  </p>
                </div>
                {done ? (
                  <span className="flex items-center gap-2">
                    <span className="text-accent-orange text-lg">✓</span>
                    <span className="text-text-muted text-xs underline">Edit</span>
                  </span>
                ) : (
                  <span className="text-text-muted text-xs">Log</span>
                )}
              </button>

              {isOpen && (
                <SetLogger
                  goalId={goalId}
                  item={item}
                  loggedSets={loggedSets}
                  suggestion={suggestions[item.exerciseName] ?? null}
                  onAllComplete={celebrateIfNeeded}
                  onRefresh={() => router.refresh()}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SetLogger({
  goalId,
  item,
  loggedSets,
  suggestion,
  onAllComplete,
  onRefresh,
}: {
  goalId: string;
  item: GoalItem;
  loggedSets: LoggedSet[];
  suggestion: Suggestion;
  onAllComplete: (allComplete: boolean) => void;
  onRefresh: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [savingSet, setSavingSet] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const setsByNumber = new Map(loggedSets.map((s) => [s.setNumber, s]));

  async function handleLog(setNumber: number, reps: number, weight: number, unit: "lbs" | "kg") {
    if (reps <= 0 && weight <= 0) {
      setError("Enter reps and weight.");
      return;
    }
    setError(null);
    setSavingSet(setNumber);
    try {
      const result = await logGoalSet(goalId, item.id, item.exerciseName, item.targetSets, setNumber, {
        reps,
        weight,
        weightUnit: unit,
      });
      setSavingSet(null);
      onAllComplete(result.allComplete);
      onRefresh();
    } catch (err) {
      setSavingSet(null);
      setError(err instanceof Error ? err.message : "Failed to log");
    }
  }

  function handleEdit(setId: string, reps: number, weight: number, unit: "lbs" | "kg") {
    startTransition(async () => {
      try {
        await updateGoalSet(setId, { reps, weight, weightUnit: unit });
        onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update");
      }
    });
  }

  return (
    <div className="px-3 pb-3 flex flex-col gap-3 border-t border-border pt-2">
      {suggestion && (
        <p className="text-xs text-text-muted">
          Suggested: {suggestion.weight} {suggestion.unit}
        </p>
      )}
      {Array.from({ length: item.targetSets }, (_, i) => i + 1).map((setNumber) => {
        const logged = setsByNumber.get(setNumber);
        return (
          <SetRow
            key={setNumber}
            setNumber={setNumber}
            logged={logged}
            defaultReps={item.targetReps}
            defaultWeight={suggestion?.weight ?? 0}
            defaultUnit={suggestion?.unit ?? "lbs"}
            saving={savingSet === setNumber || (isPending && !!logged)}
            onLog={(reps, weight, unit) => handleLog(setNumber, reps, weight, unit)}
            onEdit={
              logged ? (reps, weight, unit) => handleEdit(logged.id, reps, weight, unit) : undefined
            }
          />
        );
      })}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

function SetRow({
  setNumber,
  logged,
  defaultReps,
  defaultWeight,
  defaultUnit,
  saving,
  onLog,
  onEdit,
}: {
  setNumber: number;
  logged: LoggedSet | undefined;
  defaultReps: number;
  defaultWeight: number;
  defaultUnit: "lbs" | "kg";
  saving: boolean;
  onLog: (reps: number, weight: number, unit: "lbs" | "kg") => void;
  onEdit?: (reps: number, weight: number, unit: "lbs" | "kg") => void;
}) {
  const [reps, setReps] = useState(logged?.reps ?? defaultReps);
  const [weight, setWeight] = useState(logged?.weight ?? defaultWeight);
  const [unit, setUnit] = useState<"lbs" | "kg">(logged?.weightUnit ?? defaultUnit);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">Set {setNumber}</span>
        {logged && <span className="text-accent-orange text-xs">✓ logged</span>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input
          type="number"
          min={0}
          placeholder="Reps"
          value={reps || ""}
          onChange={(e) => setReps(Number(e.target.value))}
          onBlur={() => onEdit && onEdit(reps, weight, unit)}
          className="border rounded-lg px-2 py-2 text-sm min-w-0 w-full"
        />
        <input
          type="number"
          min={0}
          step="0.5"
          placeholder="Weight"
          value={weight || ""}
          onChange={(e) => setWeight(Number(e.target.value))}
          onBlur={() => onEdit && onEdit(reps, weight, unit)}
          className="border rounded-lg px-2 py-2 text-sm min-w-0 w-full"
        />
        <select
          value={unit}
          onChange={(e) => {
            const next = e.target.value as "lbs" | "kg";
            setUnit(next);
            if (onEdit) onEdit(reps, weight, next);
          }}
          className="border rounded-lg px-2 py-2 text-sm min-w-0 w-full"
        >
          <option value="lbs">lbs</option>
          <option value="kg">kg</option>
        </select>
      </div>
      {!logged && (
        <button
          type="button"
          onClick={() => onLog(reps, weight, unit)}
          disabled={saving}
          className="bg-gradient-to-r from-accent-purple to-accent-purple-2 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
        >
          {saving ? "Saving…" : "Log set"}
        </button>
      )}
    </div>
  );
}
