import {
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  format,
} from 'date-fns';

export function getCompactTimeAgo(date: Date): string {
  const now = new Date();

  const minutes = differenceInMinutes(now, date);
  if (minutes < 60) return `${minutes}m`;

  const hours = differenceInHours(now, date);
  if (hours < 24) return `${hours}h`;

  const days = differenceInDays(now, date);
  if (days <= 6) return `${days}d`;

  const years = differenceInYears(now, date);
  if (years >= 1) return format(date, 'd MMM yyyy'); // e.g., 5 Jul 2024

  const months = differenceInMonths(now, date);
  if (months >= 1) return format(date, 'd MMM'); // e.g., 5 Jul

  // If older than 6 days but less than a month
  return format(date, 'd MMM');
}
