const MENTION_PATTERN =
  /(?<![\w@])@([a-z0-9_](?:[a-z0-9_.-]{0,28}[a-z0-9_])?)(?=$|[\s.,!?;:)\]])/gi;
const URL_PATTERN =
  /((?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*))/gi;

function normalizeMention(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeUrl(raw) {
  const value = String(raw ?? "").trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(value)) return `https://${value}`;
  return value;
}

function findNextMatch(regex, text, start) {
  regex.lastIndex = start;
  const match = regex.exec(text);
  if (!match) return null;
  return {
    index: match.index,
    end: match.index + match[0].length,
    match,
  };
}

function tokenizeLine(line) {
  const tokens = [];
  let cursor = 0;

  while (cursor < line.length) {
    const mentionMatch = findNextMatch(MENTION_PATTERN, line, cursor);
    const urlMatch = findNextMatch(URL_PATTERN, line, cursor);

    const nextMatch =
      mentionMatch && urlMatch
        ? mentionMatch.index <= urlMatch.index
          ? { type: "mention", ...mentionMatch }
          : { type: "url", ...urlMatch }
        : mentionMatch
          ? { type: "mention", ...mentionMatch }
          : urlMatch
            ? { type: "url", ...urlMatch }
            : null;

    if (!nextMatch) {
      const remainder = line.slice(cursor);
      if (remainder) {
        tokens.push({ type: "text", value: remainder });
      }
      break;
    }

    if (nextMatch.index > cursor) {
      tokens.push({
        type: "text",
        value: line.slice(cursor, nextMatch.index),
      });
    }

    if (nextMatch.type === "mention") {
      tokens.push({
        type: "mention",
        value: normalizeMention(nextMatch.match[1]),
        raw: nextMatch.match[0],
      });
    } else {
      tokens.push({
        type: "url",
        value: normalizeUrl(nextMatch.match[0]),
        raw: nextMatch.match[0],
      });
    }

    cursor = nextMatch.end;
  }

  return tokens;
}

export function tokenizeRichText(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  return lines.map(tokenizeLine);
}

export function extractMentionUsernames(text) {
  const seen = new Set();
  const mentions = [];

  for (const line of tokenizeRichText(text)) {
    for (const token of line) {
      if (token.type !== "mention") continue;
      if (seen.has(token.value)) continue;
      seen.add(token.value);
      mentions.push(token.value);
    }
  }

  return mentions;
}
