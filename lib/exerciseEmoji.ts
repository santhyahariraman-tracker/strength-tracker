const EMOJI_RULES: [RegExp, string][] = [
  [/bench|press|chest|push.?up/i, "🏋️"],
  [/squat|leg|lunge|calf/i, "🦵"],
  [/deadlift/i, "🏋️‍♂️"],
  [/run|sprint|treadmill/i, "🏃"],
  [/bike|cycle|spin/i, "🚴"],
  [/row|rowing/i, "🚣"],
  [/pull.?up|pulldown|lat|climb/i, "🧗"],
  [/curl|bicep|tricep|arm/i, "💪"],
  [/yoga|stretch|mobility/i, "🧘"],
  [/plank|core|ab(s)?\b/i, "🔥"],
  [/shoulder|delt/i, "🏋️"],
  [/swim/i, "🏊"],
];

export function exerciseEmoji(name: string): string {
  for (const [pattern, emoji] of EMOJI_RULES) {
    if (pattern.test(name)) return emoji;
  }
  return "💪";
}
