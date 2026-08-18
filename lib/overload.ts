const KG_TO_LBS = 2.20462;
const INCREMENT_LBS = 5;

export function suggestNextWeight(
  lastWeight: number,
  lastUnit: "lbs" | "kg",
  lastReps: number,
  targetReps: number
): { weight: number; unit: "lbs" | "kg" } {
  const lastWeightLbs = lastUnit === "kg" ? lastWeight * KG_TO_LBS : lastWeight;
  const metOrExceeded = lastReps >= targetReps;
  const suggestedLbs = metOrExceeded ? lastWeightLbs + INCREMENT_LBS : lastWeightLbs;
  const suggested = lastUnit === "kg" ? suggestedLbs / KG_TO_LBS : suggestedLbs;
  return { weight: Math.round(suggested * 10) / 10, unit: lastUnit };
}
