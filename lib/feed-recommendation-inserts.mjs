const MIN_ITEMS_FOR_INSERTS = 8;
const MAX_SLOTS = 3;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Deterministic PRNG (mulberry32) seeded from a string — same pattern as
// rankVideoCandidates in lib/video-recommendations.mjs. The same seed
// always reproduces the same shuffle, so a re-render of the same feed
// (e.g. a parent state update) doesn't jump interstitial types around
// mid-scroll; a different seed (a fresh page load) varies it.
function seededRandom(seedString) {
  let h = 1779033703 ^ seedString.length;
  for (let i = 0; i < seedString.length; i++) {
    h = Math.imul(h ^ seedString.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(items, seedString) {
  const next = seededRandom(seedString);
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * @param {{
 *   itemCount: number;
 *   engagementScore?: number;
 *   availableTypes?: readonly string[];
 *   seed?: string;
 * }} options
 */
export function computeRecommendationSlots({
  itemCount,
  engagementScore = 0,
  availableTypes = [],
  seed,
}) {
  const uniqueTypes = [...new Set(availableTypes)].filter(Boolean);

  if (itemCount < MIN_ITEMS_FOR_INSERTS || uniqueTypes.length === 0) {
    return [];
  }

  const normalizedEngagement = Number.isFinite(engagementScore)
    ? clamp(engagementScore, 0, 1)
    : 0;

  const shouldInsert =
    normalizedEngagement >= 0.35 || itemCount >= MIN_ITEMS_FOR_INSERTS + 4;

  if (!shouldInsert) {
    return [];
  }

  const firstSlotIndex =
    normalizedEngagement >= 0.75
      ? 5
      : normalizedEngagement >= 0.5
        ? 6
        : 7;
  const slotSpacing = normalizedEngagement >= 0.75 ? 6 : 7;
  const slotCount =
    itemCount >= 24
      ? Math.min(uniqueTypes.length, MAX_SLOTS)
      : itemCount >= 16
        ? Math.min(uniqueTypes.length, 2)
        : 1;

  // Picking from a shuffled pool (rather than types[positionIndex] straight
  // off the input order) means every available type gets a fair shot at
  // appearing in a given page, not just whichever ones happen to be listed
  // first — with many more types than slots (social recommendations plus
  // curated content), the first few array entries would otherwise be the
  // only ones anyone ever saw. No seed keeps the original deterministic
  // order (existing callers that don't pass one see unchanged behavior).
  const types = seed ? seededShuffle(uniqueTypes, seed) : uniqueTypes;

  const slots = [];

  for (let positionIndex = 0; positionIndex < slotCount; positionIndex += 1) {
    const position = firstSlotIndex + positionIndex * slotSpacing;

    if (position >= itemCount) {
      break;
    }

    slots.push({
      index: position,
      type: types[positionIndex],
    });
  }

  return slots;
}
