const DEFAULT_DISCOVER_ORDER = [
  { type: "saves", label: "Top saves", href: "/discover?q=saved" },
  { type: "events", label: "Top events", href: "/discover/events" },
  { type: "groups", label: "Top groups", href: "/discover?q=groups" },
  { type: "people", label: "Top people", href: "/discover?q=people" },
];

export function buildDiscoverSections({
  savedCount = 0,
  eventCount = 0,
  groupCount = 0,
  peopleCount = 0,
}) {
  const counts = {
    saves: savedCount,
    events: eventCount,
    groups: groupCount,
    people: peopleCount,
  };

  return DEFAULT_DISCOVER_ORDER.map(section => ({
    ...section,
    count: counts[section.type] ?? 0,
  }));
}
