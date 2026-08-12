export function canUsePrivateData(authReady, userUid) {
  return Boolean(authReady && userUid);
}
