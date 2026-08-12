const URL_PATTERN =
  /((?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*))/gi;

export function normalizeUrl(raw) {
  const url = String(raw ?? "").trim();

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(url)) {
    return `https://${url}`;
  }

  return url;
}

export function extractUrls(text) {
  return [...String(text ?? "").matchAll(URL_PATTERN)].map(match =>
    normalizeUrl(match[0])
  );
}

export function extractFirstUrl(text) {
  return extractUrls(text)[0] ?? "";
}
