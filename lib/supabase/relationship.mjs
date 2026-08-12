import { normalizeWriteRow } from "./firestore-schema.mjs";

const RELATIONSHIP_KINDS = {
  followers: "follow",
  following: "follow",
  friends: "friend",
  friendRequestsSent: "request-sent",
  friendRequestsReceived: "request-received",
  watched: "watch",
  blocked: "block",
};

function buildRelationshipDocId(ownerUid, kind, targetUid) {
  return `owneruid:${ownerUid}|kind:${kind}|targetuid:${targetUid ?? ""}`;
}

export function getRelationshipTarget(segments) {
  const [root, ownerUid, collectionName, childUid] = segments;

  if (root !== "users" || !ownerUid || !collectionName) {
    return null;
  }

  const kind = RELATIONSHIP_KINDS[collectionName];
  if (!kind) {
    return null;
  }

  const isFollowers = collectionName === "followers";
  const baseFilterField = isFollowers ? "targetuid" : "owneruid";

  const target = {
    table: "user_relationships",
    idColumn: "id",
    baseFilters: [
      { field: baseFilterField, op: "==", value: ownerUid },
      { field: "kind", op: "==", value: kind },
    ],
    snapshotIdField: isFollowers || collectionName === "friendRequestsReceived" ? "owneruid" : "targetuid",
  };

  if (!childUid) {
    // Collection-level query, e.g. listing everyone a user follows — there is
    // no single row to target, just the owner+kind filter above.
    return target;
  }

  const rowOwnerUid = isFollowers ? childUid : ownerUid;
  const rowTargetUid = isFollowers ? ownerUid : childUid;

  return {
    ...target,
    row: {
      owneruid: rowOwnerUid,
      targetuid: rowTargetUid,
      kind,
    },
    docId: childUid,
    rowId: buildRelationshipDocId(rowOwnerUid, kind, rowTargetUid),
  };
}

export function getRelationshipRow(segments) {
  return getRelationshipTarget(segments)?.row ?? null;
}

export function getRelationshipDocId(segments) {
  return getRelationshipTarget(segments)?.docId ?? null;
}

export function buildRelationshipRowId(ownerUid, kind, targetUid) {
  return buildRelationshipDocId(ownerUid, kind, targetUid);
}

export function normalizeRelationshipWriteRow(segments, data = {}) {
  const target = getRelationshipTarget(segments);
  if (!target) {
    return null;
  }

  const normalizedData = normalizeWriteRow("user_relationships", data);
  const allowedFields = new Set([
    "id",
    "owneruid",
    "targetuid",
    "kind",
    "since",
    "followedat",
    "initiatedby",
    "payload",
    "createdat",
    "updatedat",
  ]);

  const payload = {};
  const row = {
    id: target.rowId,
    ...target.row,
  };

  for (const [field, value] of Object.entries(normalizedData)) {
    if (allowedFields.has(field)) {
      if (field === "payload" && value && typeof value === "object" && !Array.isArray(value)) {
        Object.assign(payload, value);
      } else {
        row[field] = value;
      }
      continue;
    }

    payload[field] = value;
  }

  if (Object.keys(payload).length > 0) {
    row.payload = {
      ...(row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? row.payload
        : {}),
      ...payload,
    };
  }

  return row;
}
