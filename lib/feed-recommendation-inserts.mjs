const MIN_ITEMS_FOR_INSERTS = 8;
const MAX_SLOTS = 3;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * @param {{
 *   itemCount: number;
 *   engagementScore?: number;
 *   availableTypes?: readonly string[];
 * }} options
 */
export function computeRecommendationSlots({
  itemCount,
  engagementScore = 0,
  availableTypes = [],
}) {
  const types = [...new Set(availableTypes)].filter(Boolean);

  if (itemCount < MIN_ITEMS_FOR_INSERTS || types.length === 0) {
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
      ? Math.min(types.length, MAX_SLOTS)
      : itemCount >= 16
        ? Math.min(types.length, 2)
        : 1;

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
