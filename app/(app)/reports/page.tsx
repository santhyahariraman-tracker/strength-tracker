import { createClient } from "@/lib/supabase/server";
import { Reports } from "@/components/Reports";

export default async function ReportsPage() {
  const supabase = await createClient();

  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, workout_date, exercises(id, name, sets(id, reps, weight, weight_unit))")
    .order("workout_date", { ascending: true });

  return <Reports workouts={workouts ?? []} />;
}
