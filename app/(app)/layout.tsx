import { BottomNav } from "@/components/BottomNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1 w-full max-w-md mx-auto min-h-screen">
      <header className="flex items-center gap-2 px-5 pt-6 pb-2">
        <span className="text-xl">🏋️</span>
        <h1 className="text-lg font-semibold tracking-tight">Strength Tracker</h1>
      </header>
      <main className="flex-1 px-4 pb-28">{children}</main>
      <BottomNav />
    </div>
  );
}
