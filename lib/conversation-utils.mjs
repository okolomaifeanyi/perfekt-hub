export function buildDirectConversationId(uidA, uidB) {
  return Array.from(
    new Set([uidA, uidB].map(value => String(value ?? "").trim()).filter(Boolean))
  )
    .sort()
    .join("_");
}

export function parseDirectConversationId(conversationId) {
  const participants = String(conversationId ?? "")
    .split("_")
    .map(value => value.trim())
    .filter(Boolean);

  const uniqueParticipants = Array.from(new Set(participants)).sort();

  if (uniqueParticipants.length < 2) {
    return null;
  }

  return uniqueParticipants.slice(0, 2);
}

export function getOtherConversationParticipant(participants, currentUid) {
  return (
    participants.find(participant => participant && participant !== currentUid) ??
    null
  );
}
