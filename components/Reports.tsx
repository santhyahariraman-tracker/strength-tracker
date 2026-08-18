"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const KG_TO_LBS = 2.20462;

type SetRow = { id: string; reps: number; weight: number; weight_unit: "lbs" | "kg" };
type ExerciseRow = { id: string; name: string; sets: SetRow[] };
type WorkoutRow = { id: string; workout_date: string; exercises: ExerciseRow[] };

function toLbs(weight: number, unit: "lbs" | "kg") {
  return unit === "kg" ? weight * KG_TO_LBS : weight;
}

function convert(lbsValue: number, unit: "lbs" | "kg") {
  return unit === "kg" ? lbsValue / KG_TO_LBS : lbsValue;
}

function startOfWeek(d: Date) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());
  return date;
}

function formatShortDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function Reports({ workouts }: { workouts: WorkoutRow[] }) {
  const [unit, setUnit] = useState<"lbs" | "kg">("lbs");

  const exerciseNames = useMemo(() => {
    const names = new Set<string>();
    workouts.forEach((w) => w.exercises.forEach((e) => names.add(e.name)));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [workouts]);

  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const activeExercise = selectedExercise || exerciseNames[0] || "";

  const now = new Date();
  const totalWorkouts = workouts.length;
  const thisWeekStart = startOfWeek(now);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const workoutsThisWeek = workouts.filter(
    (w) => new Date(w.workout_date + "T00:00:00") >= thisWeekStart
  ).length;
  const workoutsThisMonth = workouts.filter(
    (w) => new Date(w.workout_date + "T00:00:00") >= thisMonthStart
  ).length;

  const currentStreakWeeks = useMemo(() => {
    const weeksWithWorkout = new Set(
      workouts.map((w) => startOfWeek(new Date(w.workout_date + "T00:00:00")).getTime())
    );
    let streak = 0;
    const cursor = startOfWeek(now);
    while (weeksWithWorkout.has(cursor.getTime())) {
      streak++;
      cursor.setDate(cursor.getDate() - 7);
    }
    return streak;
  }, [workouts]);

  const weeklyFrequency = useMemo(() => {
    const buckets: { weekStart: number; label: string; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const ws = startOfWeek(now);
      ws.setDate(ws.getDate() - i * 7);
      buckets.push({
        weekStart: ws.getTime(),
        label: ws.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count: 0,
      });
    }
    workouts.forEach((w) => {
      const ws = startOfWeek(new Date(w.workout_date + "T00:00:00")).getTime();
      const bucket = buckets.find((b) => b.weekStart === ws);
      if (bucket) bucket.count++;
    });
    return buckets;
  }, [workouts]);

  const trendData = useMemo(() => {
    if (!activeExercise) return [];
    const sessions: { date: string; maxWeight: number; volume: number }[] = [];
    workouts.forEach((w) => {
      w.exercises
        .filter((e) => e.name === activeExercise)
        .forEach((e) => {
          if (e.sets.length === 0) return;
          const maxWeightLbs = Math.max(...e.sets.map((s) => toLbs(s.weight, s.weight_unit)));
          const volumeLbs = e.sets.reduce(
            (sum, s) => sum + s.reps * toLbs(s.weight, s.weight_unit),
            0
          );
          sessions.push({
            date: w.workout_date,
            maxWeight: Math.round(convert(maxWeightLbs, unit) * 10) / 10,
            volume: Math.round(convert(volumeLbs, unit)),
          });
        });
    });
    return sessions
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => ({ ...s, label: formatShortDate(s.date) }));
  }, [workouts, activeExercise, unit]);

  const personalRecords = useMemo(() => {
    const map = new Map<string, { maxWeightLbs: number; maxWeightDate: string; maxReps: number; maxRepsDate: string }>();
    workouts.forEach((w) => {
      w.exercises.forEach((e) => {
        e.sets.forEach((s) => {
          const weightLbs = toLbs(s.weight, s.weight_unit);
          const existing = map.get(e.name);
          if (!existing) {
            map.set(e.name, {
              maxWeightLbs: weightLbs,
              maxWeightDate: w.workout_date,
              maxReps: s.reps,
              maxRepsDate: w.workout_date,
            });
          } else {
            if (weightLbs > existing.maxWeightLbs) {
              existing.maxWeightLbs = weightLbs;
              existing.maxWeightDate = w.workout_date;
            }
            if (s.reps > existing.maxReps) {
              existing.maxReps = s.reps;
              existing.maxRepsDate = w.workout_date;
            }
          }
        });
      });
    });
    return [...map.entries()]
      .map(([name, rec]) => ({
        name,
        maxWeight: Math.round(convert(rec.maxWeightLbs, unit) * 10) / 10,
        maxWeightDate: rec.maxWeightDate,
        maxReps: rec.maxReps,
        maxRepsDate: rec.maxRepsDate,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [workouts, unit]);

  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Reports</h1>
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setUnit("lbs")}
            className={`px-3 py-1.5 ${unit === "lbs" ? "bg-accent-purple text-white" : "text-text-muted"}`}
          >
            lbs
          </button>
          <button
            type="button"
            onClick={() => setUnit("kg")}
            className={`px-3 py-1.5 ${unit === "kg" ? "bg-accent-purple text-white" : "text-text-muted"}`}
          >
            kg
          </button>
        </div>
      </div>

      {/* Frequency */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-widest text-text-muted uppercase">
          Frequency
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          <StatTile label="Total workouts" value={String(totalWorkouts)} />
          <StatTile label="This week" value={String(workoutsThisWeek)} />
          <StatTile label="This month" value={String(workoutsThisMonth)} />
          <StatTile label="Week streak" value={String(currentStreakWeeks)} />
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xs text-text-muted mb-2">Workouts per week (last 8 weeks)</p>
          <div className="h-40 w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%" minWidth={280}>
              <BarChart data={weeklyFrequency} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={24}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--text)" }}
                  cursor={{ fill: "var(--surface-2)" }}
                />
                <Bar dataKey="count" name="Workouts" fill="#6c5ce7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Exercise trend */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-widest text-text-muted uppercase">
          Exercise trend
        </h2>
        {exerciseNames.length === 0 ? (
          <p className="text-sm text-text-muted">Log an exercise to see trends here.</p>
        ) : (
          <>
            <select
              value={activeExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="border rounded-lg px-3 py-2.5 text-sm"
            >
              {exerciseNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {trendData.length < 2 ? (
              <p className="text-sm text-text-muted">
                Log {activeExercise} at least twice to see a trend.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <TrendChart
                  title={`Max weight (${unit})`}
                  data={trendData}
                  dataKey="maxWeight"
                  color="#6c5ce7"
                />
                <TrendChart
                  title={`Volume (${unit})`}
                  data={trendData}
                  dataKey="volume"
                  color="#b5621f"
                />
              </div>
            )}
          </>
        )}
      </section>

      {/* Personal records */}
      <section className="flex flex-col gap-3 pb-4">
        <h2 className="text-xs font-semibold tracking-widest text-text-muted uppercase">
          Personal records
        </h2>
        {personalRecords.length === 0 ? (
          <p className="text-sm text-text-muted">No records yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {personalRecords.map((rec) => (
              <div
                key={rec.name}
                className="rounded-xl border border-border bg-surface px-4 py-3"
              >
                <p className="font-medium text-sm">{rec.name}</p>
                <div className="flex justify-between mt-1 text-xs text-text-muted">
                  <span>
                    Best weight: <span className="text-text">{rec.maxWeight} {unit}</span>
                    {" · "}
                    {formatShortDate(rec.maxWeightDate)}
                  </span>
                </div>
                <div className="flex justify-between mt-0.5 text-xs text-text-muted">
                  <span>
                    Best set: <span className="text-text">{rec.maxReps} reps</span>
                    {" · "}
                    {formatShortDate(rec.maxRepsDate)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
    </div>
  );
}

function TrendChart({
  title,
  data,
  dataKey,
  color,
}: {
  title: string;
  data: Record<string, string | number>[];
  dataKey: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-xs text-text-muted mb-2 flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
        {title}
      </p>
      <div className="h-36 w-full overflow-x-auto">
        <ResponsiveContainer width="100%" height="100%" minWidth={280}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--text)" }}
              cursor={{ stroke: "var(--border)" }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              name={title}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
