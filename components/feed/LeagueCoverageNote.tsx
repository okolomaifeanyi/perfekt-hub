import { FOOTBALL_LEAGUES } from "@/lib/curated-content-categories.mjs";

// Missing fixtures/results are usually a coverage-scope question, not a
// bug — cup competitions like the FA Cup or Community Shield aren't on our
// data source's free tier, so a real match can legitimately never show up
// here. Spelling that out beats visitors assuming something's broken.
export function LeagueCoverageNote() {
  const names = FOOTBALL_LEAGUES.map(league => league.name);
  return (
    <p className="mb-2 text-xs text-muted-foreground">
      Covering {names.slice(0, -1).join(", ")}, and {names[names.length - 1]}. Cup
      competitions (FA Cup, Community Shield, etc.) aren&apos;t included yet.
    </p>
  );
}
