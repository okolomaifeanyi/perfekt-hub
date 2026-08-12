export const SAVED_ACCOUNTS_STORAGE_KEY = "perfekt-hub:saved-accounts";
export const MAX_SAVED_ACCOUNTS = 5;

function resolveStorage(storage) {
  if (storage) return storage;
  if (typeof window !== "undefined") return window.localStorage;
  return null;
}

function safeParseAccounts(rawValue) {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWriteAccounts(storage, accounts) {
  storage?.setItem?.(
    SAVED_ACCOUNTS_STORAGE_KEY,
    JSON.stringify(accounts)
  );
}

export function normalizeSavedAccount(account) {
  return {
    uid: String(account.uid ?? "").trim(),
    email: String(account.email ?? "").trim(),
    username: String(account.username ?? "").trim(),
    fullName: String(account.fullName ?? "").trim(),
    photoURL: String(account.photoURL ?? "").trim(),
    providerId: String(account.providerId ?? "supabase").trim(),
    accessToken: String(account.accessToken ?? "").trim(),
    refreshToken: String(account.refreshToken ?? "").trim(),
    lastUsedAt:
      String(account.lastUsedAt ?? "").trim() || new Date().toISOString(),
  };
}

export function buildSavedAccountFromSession({
  user,
  session,
  profile,
}) {
  return normalizeSavedAccount({
    uid: user?.id ?? profile?.uid ?? "",
    email: user?.email ?? profile?.email ?? "",
    username: profile?.username ?? user?.user_metadata?.username ?? "",
    fullName:
      profile?.fullName ??
      user?.user_metadata?.fullName ??
      user?.user_metadata?.name ??
      "",
    photoURL:
      profile?.photoURL ??
      user?.user_metadata?.avatar_url ??
      user?.user_metadata?.picture ??
      user?.user_metadata?.photoURL ??
      "",
    providerId: user?.app_metadata?.provider ?? "supabase",
    accessToken: session?.access_token ?? "",
    refreshToken: session?.refresh_token ?? "",
    lastUsedAt: new Date().toISOString(),
  });
}

export function readSavedAccounts(storage) {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return [];

  return safeParseAccounts(
    resolvedStorage.getItem?.(SAVED_ACCOUNTS_STORAGE_KEY)
  )
    .map(normalizeSavedAccount)
    .filter(account => account.uid);
}

export function writeSavedAccounts(storage, accounts) {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return [];

  const normalized = accounts
    .map(normalizeSavedAccount)
    .filter(account => account.uid)
    .sort((left, right) =>
      String(right.lastUsedAt).localeCompare(String(left.lastUsedAt))
    )
    .slice(0, MAX_SAVED_ACCOUNTS);

  safeWriteAccounts(resolvedStorage, normalized);
  return normalized;
}

export function rememberSavedAccount(storage, account) {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return [];

  const nextAccount = normalizeSavedAccount(account);
  const currentAccounts = readSavedAccounts(resolvedStorage).filter(
    existing => existing.uid !== nextAccount.uid
  );

  return writeSavedAccounts(resolvedStorage, [nextAccount, ...currentAccounts]);
}

export function removeSavedAccount(storage, uid) {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return [];

  const remaining = readSavedAccounts(resolvedStorage).filter(
    account => account.uid !== uid
  );

  return writeSavedAccounts(resolvedStorage, remaining);
}
