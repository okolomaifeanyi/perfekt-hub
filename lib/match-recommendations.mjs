function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function scoreGender(candidateGender, genderPreference) {
  if (!genderPreference) return 0;

  return normalizeText(candidateGender) === normalizeText(genderPreference)
    ? 100
    : -80;
}

function scoreAgeFit(ageDiff, ageRange) {
  const diff = Math.abs(toNumber(ageDiff));
  const [minAge = 0, maxAge = 0] = Array.isArray(ageRange) ? ageRange : [];
  const span = Math.max(0, maxAge - minAge);

  if (!span) {
    return Math.max(0, 24 - diff * 4);
  }

  const idealDistance = Math.max(0, span / 4);
  return Math.max(0, 28 - Math.abs(diff - idealDistance) * 5);
}

export function rankMatchCandidates(candidates, preferences = {}) {
  if (!normalizeText(preferences.genderPreference)) {
    return [];
  }

  return [...candidates].sort((left, right) => {
    const leftScore =
      scoreGender(left.gender, preferences.genderPreference) +
      scoreAgeFit(left.ageDiff, preferences.ageRange) +
      toNumber(left.workMatch) * 5 +
      toNumber(left.interestMatch) * 6 +
      toNumber(left.likeMatch) * 4 +
      toNumber(left.friendOfFriend) * 7 +
      (normalizeText(preferences.relationshipIntent) === "marriage" ? 10 : 0);

    const rightScore =
      scoreGender(right.gender, preferences.genderPreference) +
      scoreAgeFit(right.ageDiff, preferences.ageRange) +
      toNumber(right.workMatch) * 5 +
      toNumber(right.interestMatch) * 6 +
      toNumber(right.likeMatch) * 4 +
      toNumber(right.friendOfFriend) * 7 +
      (normalizeText(preferences.relationshipIntent) === "marriage" ? 10 : 0);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return normalizeText(right.id).localeCompare(normalizeText(left.id));
  });
}
