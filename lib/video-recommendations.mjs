// Deterministic PRNG (mulberry32) seeded from a string, so the same seed
// always reproduces the same shuffle — no external dependency needed for
// something this small.
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
 * Ranks by watch time, then likes, tags, quotes, replies, follows, in that
 * strict priority order — candidates with genuinely different engagement
 * always sort correctly regardless of `seed`.
 *
 * `seed` (typically the viewer's uid, optionally +date for daily rotation)
 * pre-shuffles the input before the stable sort so that candidates tied on
 * every field — the common case for fresh, low-engagement content — land
 * in a per-user order instead of every viewer seeing the identical
 * (feedPosts-array-order) sequence for the entire tied group. Without a
 * seed the sort is unchanged (stable, ties keep input order) — same
 * behavior calling code that doesn't pass one has always gotten.
 */
export function rankVideoCandidates(candidates, seed) {
  const source = seed ? seededShuffle(candidates, seed) : candidates;
  return [...source].sort((left, right) => {
    const fields = ["watchTime", "likes", "tags", "quotes", "replies", "follows"];

    for (const field of fields) {
      if ((right[field] ?? 0) !== (left[field] ?? 0)) {
        return (right[field] ?? 0) - (left[field] ?? 0);
      }
    }

    return 0;
  });
}

export function refillVideoQueue({ currentQueue, candidates, targetSize }) {
  const queue = [...currentQueue];

  for (const candidate of candidates) {
    if (queue.length >= targetSize) break;
    if (!queue.some(item => item.id === candidate.id)) {
      queue.push(candidate);
    }
  }

  return queue;
}
