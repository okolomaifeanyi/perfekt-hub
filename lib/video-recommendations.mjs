export function rankVideoCandidates(candidates) {
  return [...candidates].sort((left, right) => {
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
