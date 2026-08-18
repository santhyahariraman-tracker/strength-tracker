"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions";

function DumbbellIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "var(--accent-orange)" : "var(--text-muted)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.5 6.5 17.5 17.5" />
      <path d="M4 4 6.5 6.5" />
      <path d="M17.5 17.5 20 20" />
      <rect x="2" y="2" width="4" height="4" rx="1" />
      <rect x="18" y="18" width="4" height="4" rx="1" />
      <path d="M9 5 5 9" />
      <path d="M19 15 15 19" />
    </svg>
  );
}

function PlusIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "var(--accent-orange)" : "var(--text-muted)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--text-muted)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isNew = pathname === "/workouts/new";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface/95 backdrop-blur">
      <div className="max-w-md mx-auto grid grid-cols-3 items-center px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <Link
          href="/"
          className="flex flex-col items-center gap-1 py-1 rounded-lg"
        >
          <DumbbellIcon active={isHome} />
          <span
            className="text-[11px] font-medium"
            style={{ color: isHome ? "var(--accent-orange)" : "var(--text-muted)" }}
          >
            Workouts
          </span>
        </Link>

        <Link
          href="/workouts/new"
          className="flex flex-col items-center gap-1 py-1 rounded-lg"
        >
          <PlusIcon active={isNew} />
          <span
            className="text-[11px] font-medium"
            style={{ color: isNew ? "var(--accent-orange)" : "var(--text-muted)" }}
          >
            New
          </span>
        </Link>

        <form action={signOut} className="flex justify-center">
          <button
            type="submit"
            className="flex flex-col items-center gap-1 py-1 rounded-lg"
          >
            <SignOutIcon />
            <span className="text-[11px] font-medium text-text-muted">Sign out</span>
          </button>
        </form>
      </div>
    </nav>
  );
}
