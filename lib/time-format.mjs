import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInMonths,
  differenceInYears,
  format,
} from "date-fns";

export function getCompactTimeAgo(date) {
  const now = new Date();

  const minutes = differenceInMinutes(now, date);
  if (minutes < 60) return `${minutes}m`;

  const hours = differenceInHours(now, date);
  if (hours < 24) return `${hours}h`;

  const days = differenceInDays(now, date);
  if (days <= 6) return `${days}d`;

  const years = differenceInYears(now, date);
  if (years >= 1) return format(date, "d MMM yyyy");

  const months = differenceInMonths(now, date);
  if (months >= 1) return format(date, "d MMM");

  return !date ? "Just now" : format(date, "d MMM");
}
