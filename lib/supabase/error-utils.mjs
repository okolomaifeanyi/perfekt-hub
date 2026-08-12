function toText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? "" : serialized;
  } catch {
    return "";
  }
}

export function normalizeUnknownError(error, fallbackMessage = "An unknown error occurred.") {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string") {
    return new Error(error);
  }

  if (typeof error === "number" || typeof error === "boolean") {
    return new Error(String(error));
  }

  if (error && typeof error === "object") {
    const candidate = error;
    const message =
      typeof candidate.message === "string" && candidate.message.trim()
        ? candidate.message.trim()
        : [
            typeof candidate.code === "string" && candidate.code.trim()
              ? `code: ${candidate.code.trim()}`
              : "",
            typeof candidate.hint === "string" && candidate.hint.trim()
              ? candidate.hint.trim()
              : "",
            candidate.details !== undefined && candidate.details !== null
              ? toText(candidate.details)
              : "",
          ]
            .filter(Boolean)
            .join(" — ") || fallbackMessage;

    const normalized = new Error(message);

    if (typeof candidate.code === "string") {
      normalized.code = candidate.code;
    }

    if (candidate.details !== undefined && candidate.details !== null) {
      normalized.details = candidate.details;
    }

    if (typeof candidate.hint === "string") {
      normalized.hint = candidate.hint;
    }

    if ("cause" in candidate && candidate.cause !== undefined) {
      normalized.cause = candidate.cause;
    }

    return normalized;
  }

  return new Error(fallbackMessage);
}
