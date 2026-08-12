export function normalizeUrl(raw) {
  const url = raw.trim();

  if (/^https?:\/\//i.test(url)) return url;

  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(url)) {
    return `https://${url}`;
  }

  return url;
}

export function extractLinks(text) {
  const urlRegex =
    /((?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*))/gi;

  return [...text.matchAll(urlRegex)].map(match => normalizeUrl(match[0]));
}
