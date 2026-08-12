function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function rankEvents(events) {
  return [...events].sort((left, right) => {
    const visibilityRank = value => (value === "public" ? 0 : 1);
    const leftVisibility = visibilityRank(left.visibility);
    const rightVisibility = visibilityRank(right.visibility);

    if (leftVisibility !== rightVisibility) {
      return leftVisibility - rightVisibility;
    }

    const participantDelta =
      toNumber(right.participants) - toNumber(left.participants);
    if (participantDelta !== 0) {
      return participantDelta;
    }

    return String(left.id ?? "").localeCompare(String(right.id ?? ""));
  });
}
