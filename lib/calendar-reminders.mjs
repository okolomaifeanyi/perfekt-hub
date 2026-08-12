function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function diffDays(left, right) {
  const ms = startOfDay(left).getTime() - startOfDay(right).getTime();
  return Math.round(ms / 86400000);
}

function getNextBirthdayDate(dob, now) {
  const dobDate = toDate(dob);
  if (!dobDate) return null;

  const next = new Date(now);
  next.setMonth(dobDate.getMonth(), dobDate.getDate());
  next.setHours(0, 0, 0, 0);

  if (next < startOfDay(now)) {
    next.setFullYear(now.getFullYear() + 1);
  }

  return next;
}

export function buildBirthdayReminders(friends, now = new Date()) {
  return friends
    .map(friend => {
      const nextBirthday = getNextBirthdayDate(friend.dob, now);
      if (!nextBirthday) return null;

      return {
        friend,
        nextBirthday,
        daysUntil: diffDays(nextBirthday, now),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.daysUntil - right.daysUntil);
}

export function buildMemoryReminders(posts, now = new Date()) {
  return posts
    .map(post => {
      const createdAt = toDate(post.createdAt);
      if (!createdAt) return null;

      const ageDays = Math.abs(diffDays(now, createdAt));
      const isMonthMemory = Math.abs(ageDays - 30) <= 3;
      const isYearMemory = Math.abs(ageDays - 365) <= 5;

      if (!isMonthMemory && !isYearMemory) {
        return null;
      }

      return {
        post,
        label: isYearMemory ? "1 year ago" : "1 month ago",
        ageDays,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.ageDays - right.ageDays);
}
