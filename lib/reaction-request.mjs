export function buildReactionRequestBody(postId, type) {
  return { postId, type };
}

export function buildReactionRequestInit({
  postId,
  type,
  accessToken,
} = {}) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return /** @type {RequestInit} */ ({
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(buildReactionRequestBody(postId, type)),
  });
}
