import { exerciseEmoji } from "@/lib/exerciseEmoji";

export type WeekdaySummaryItem = {
  exerciseName: string;
  weight: number;
  unit: "lbs" | "kg";
  reps: number;
  suggestion: { weight: number; unit: "lbs" | "kg" } | null;
};

export function LastWeekdaySummary({
  weekdayLabel,
  dateLabel,
  items,
}: {
  weekdayLabel: string;
  dateLabel: string;
  items: WeekdaySummaryItem[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-2">
      <p className="text-xs text-text-muted">
        Last {weekdayLabel} ({dateLabel})
      </p>
      <div className="flex flex-col gap-1.5">
        {items.map((item) => (
          <div key={item.exerciseName} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 min-w-0">
              <span>{exerciseEmoji(item.exerciseName)}</span>
              <span className="truncate">{item.exerciseName}</span>
            </span>
            <span className="text-text-muted text-xs shrink-0 ml-2">
              {item.weight} {item.unit} × {item.reps}
              {item.suggestion && (
                <span className="text-accent-orange ml-1.5">
                  ↑ try {item.suggestion.weight} {item.suggestion.unit}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
