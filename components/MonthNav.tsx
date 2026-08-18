"use client";

import { useRouter, useSearchParams } from "next/navigation";

function parseMonth(param: string | null): { year: number; month: number } {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split("-").map(Number);
    return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function toParam(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function MonthNav() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { year, month } = parseMonth(searchParams.get("month"));

  function go(nextYear: number, nextMonth: number) {
    router.push(`/?month=${toParam(nextYear, nextMonth)}`);
  }

  function step(delta: number) {
    const d = new Date(year, month + delta, 1);
    go(d.getFullYear(), d.getMonth());
  }

  const label = new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={() => step(-1)}
        aria-label="Previous month"
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-text-muted"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <label className="text-sm font-medium relative">
        {label}
        <input
          type="month"
          value={toParam(year, month)}
          onChange={(e) => {
            const { year: y, month: m } = parseMonth(e.target.value);
            go(y, m);
          }}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </label>

      <button
        type="button"
        onClick={() => step(1)}
        aria-label="Next month"
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-text-muted"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
