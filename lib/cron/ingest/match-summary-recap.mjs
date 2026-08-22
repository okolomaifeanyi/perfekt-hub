// Pure formatting/prompt-building helpers for match-summary.mjs, split into
// their own file with no "@/..." imports (unlike match-summary.mjs itself)
// so they can be unit tested directly via plain `node --test` — Next's
// bundler resolves the "@/" alias via tsconfig paths, but the plain Node
// ESM loader used by the test runner has no idea what it means.

function goalTypeNote(type) {
  if (type === "PENALTY") return " [pen]";
  if (type === "OWN") return " [OG]";
  return "";
}

function formatGoalLine(goal, homeTeamId) {
  const minute = typeof goal.minute === "number" ? `${goal.minute}'` : "?";
  const injury = goal.injuryTime ? `+${goal.injuryTime}` : "";
  const scorer = goal.scorer?.name || "Unknown scorer";
  const assist = goal.assist?.name ? ` (assist: ${goal.assist.name})` : "";
  const side = goal.team?.id === homeTeamId ? "home" : "away";
  return `${minute}${injury} ${scorer}${assist}${goalTypeNote(goal.type)} (${side})`;
}

export function formatGoals(goals, homeTeamId) {
  if (!Array.isArray(goals) || goals.length === 0) return null;
  return `Goals: ${goals.map(goal => formatGoalLine(goal, homeTeamId)).join(", ")}`;
}

function cardLabel(card) {
  return card === "RED" || card === "SECOND_YELLOW" ? "Red card" : "Yellow card";
}

function formatBookingLine(booking, homeTeamId) {
  const minute = typeof booking.minute === "number" ? `${booking.minute}'` : "?";
  const player = booking.player?.name || "Unknown player";
  const side = booking.team?.id === homeTeamId ? "home" : "away";
  return `${minute} ${cardLabel(booking.card)} — ${player} (${side})`;
}

export function formatBookings(bookings, homeTeamId) {
  if (!Array.isArray(bookings) || bookings.length === 0) return null;
  return `Cards: ${bookings.map(booking => formatBookingLine(booking, homeTeamId)).join(", ")}`;
}

export function buildRecapPrompt({
  homeName,
  awayName,
  competition,
  kickoff,
  finalScore,
  goalsLine,
  bookingsLine,
  predictionBody,
}) {
  const lines = [
    `Match: ${homeName} vs ${awayName} (${competition ?? "unknown competition"}, kickoff ${kickoff})`,
    `Final score: ${homeName} ${finalScore?.home ?? "?"}-${finalScore?.away ?? "?"} ${awayName}`,
    goalsLine ?? "No goal-by-goal data available for this match.",
    bookingsLine,
    predictionBody
      ? `Pre-match prediction that was made: "${predictionBody}"`
      : "No pre-match prediction was made for this fixture.",
  ].filter(Boolean);

  return lines.join("\n");
}
