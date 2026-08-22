// Pure query-filter builder for getFootballScores (see
// app/actions/curatedContent.ts), split out so it's unit-testable without
// the "@/" aliases and Supabase client that file needs.

/**
 * Builds a single PostgREST `.or()` clause covering "in one of these
 * leagues" and "involves one of these teams" together as a UNION — a
 * visitor's followed leagues and followed teams are independent interests
 * (see hooks/useCuratedInterests.ts), so a match should show up if it
 * satisfies either one, not only when it satisfies both. Returns null when
 * neither filter applies (unfiltered).
 *
 * @param {string[] | undefined} leagueCodes
 * @param {string[] | undefined} teamIds
 * @returns {string | null}
 */
export function buildFootballScoreFilter(leagueCodes, teamIds) {
  const hasLeagues = Array.isArray(leagueCodes) && leagueCodes.length > 0;
  const hasTeams = Array.isArray(teamIds) && teamIds.length > 0;
  if (!hasLeagues && !hasTeams) return null;

  const clauses = [];
  if (hasLeagues) clauses.push(`metadata->>competitionCode.in.(${leagueCodes.join(",")})`);
  if (hasTeams) {
    const idList = teamIds.join(",");
    clauses.push(`metadata->homeTeam->>id.in.(${idList})`, `metadata->awayTeam->>id.in.(${idList})`);
  }

  return clauses.join(",");
}
