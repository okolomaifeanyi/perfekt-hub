// A pure keyword/pattern heuristic, not an AI call — this runs on every
// keystroke in the composer, so it needs to be instant and free. Requiring
// BOTH an event-ish keyword AND a date/time signal (not either alone) cuts
// down on false positives: "party" by itself is just a word, "let's meet
// Friday" alone is just plans, but "party this Friday at 8pm" together is
// unambiguous.
const EVENT_KEYWORDS = [
  "party",
  "parties",
  "meetup",
  "meet up",
  "concert",
  "wedding",
  "conference",
  "webinar",
  "workshop",
  "reunion",
  "celebration",
  "gathering",
  "ceremony",
  "festival",
  "rsvp",
  "save the date",
  "you're invited",
  "youre invited",
  "hosting",
  "join us",
  "graduation",
  "anniversary",
  "launch party",
  "open house",
  "get-together",
  "get together",
];

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const RELATIVE_DATES = ["tomorrow", "tonight", "this weekend", "next week"];

const TIME_PATTERN = /\b\d{1,2}(:\d{2})?\s?(am|pm)\b/i;

function hasEventKeyword(lower) {
  return EVENT_KEYWORDS.some(keyword => lower.includes(keyword));
}

function hasDateOrTimeSignal(lower) {
  if (TIME_PATTERN.test(lower)) return true;
  if (WEEKDAYS.some(day => lower.includes(day))) return true;
  if (MONTHS.some(month => lower.includes(month))) return true;
  if (RELATIVE_DATES.some(phrase => lower.includes(phrase))) return true;
  return false;
}

export function looksLikeEvent(text) {
  if (!text || text.trim().length < 10) return false;
  const lower = text.toLowerCase();
  return hasEventKeyword(lower) && hasDateOrTimeSignal(lower);
}
