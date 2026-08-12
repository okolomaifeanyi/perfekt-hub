export function hasAuthenticatedSession(session) {
  return Boolean(session?.access_token && session?.user?.id);
}

export function canSyncUserProfile(user, session) {
  return Boolean(
    user?.id &&
      session?.access_token &&
      session?.user?.id &&
      session.user.id === user.id
  );
}
