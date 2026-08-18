const EMOJI_RULES: [RegExp, string][] = [
  // Specific leg exercises first, so they don't collapse onto one generic icon.
  [/goblet/i, "🏺"],
  [/leg.?press/i, "🦵"],
  [/leg.?extension/i, "🦿"],
  [/lunge/i, "🤸"],
  [/split.?squat/i, "🤺"],
  [/squat/i, "🏋️‍♀️"],
  [/calf/i, "🦶"],
  [/deadlift/i, "🏋️‍♂️"],
  [/bench|chest|push.?up/i, "🏋️"],
  [/run|sprint|treadmill/i, "🏃"],
  [/bike|cycle|spin/i, "🚴"],
  [/row(ing)?\b/i, "🚣"],
  [/pull.?up|pulldown|lat|climb/i, "🧗"],
  [/curl|bicep|tricep|arm/i, "💪"],
  [/yoga|stretch|mobility/i, "🧘"],
  [/plank|core|\bab(s)?\b/i, "🔥"],
  [/shoulder|delt|press/i, "🏋️"],
  [/swim/i, "🏊"],
];

export function exerciseEmoji(name: string): string {
  for (const [pattern, emoji] of EMOJI_RULES) {
    if (pattern.test(name)) return emoji;
  }
  return "💪";
}
