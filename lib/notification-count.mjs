export async function countUnreadNotificationsForUser({
  firestore,
  userId,
}) {
  const snapshot = await firestore
    .collection("notifications")
    .where("recipientUid", "==", userId)
    .where("read", "==", false)
    .get();

  return snapshot.size ?? 0;
}
