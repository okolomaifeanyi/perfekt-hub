const TIMESTAMP_FIELD_NAMES = {
  users: new Set([
    "createdat",
    "lastseen",
    "lastloginat",
  ]),
  posts: new Set([
    "createdat",
    "engagementupdatedat",
    "lastseen",
  ]),
  conversations: new Set([
    "createdat",
    "updatedat",
    "lastmessageat",
  ]),
  messages: new Set(["createdat"]),
  notifications: new Set(["createdat"]),
  user_relationships: new Set([
    "createdat",
    "updatedat",
    "since",
    "followedat",
  ]),
  post_engagements: new Set([
    "createdat",
    "updatedat",
    "lastengagedat",
  ]),
  user_meta: new Set(["createdat", "updatedat"]),
  saved_posts: new Set(["createdat"]),
};

const FIELD_ALIASES = {
  users: {
    fullname: "fullName",
    photourl: "photoURL",
    coverurl: "coverURL",
    phonenumber: "phoneNumber",
    completedprofile: "completedProfile",
    postscount: "postsCount",
    followerscount: "followersCount",
    followingcount: "followingCount",
    friendscount: "friendsCount",
    lastseen: "lastSeen",
    createdat: "createdAt",
    lastloginat: "lastLoginAt",
    providerid: "providerId",
    randomkey: "randomKey",
    fullname_lowercase: "fullName_lowercase",
  },
  posts: {
    userid: "userId",
    createdat: "createdAt",
    userphotourl: "userPhotoURL",
    userfullname: "userFullName",
    parentpostid: "parentPostId",
    quotepostid: "quotePostId",
    replycount: "replyCount",
    quotecount: "quoteCount",
    linkpreview: "linkPreview",
    viewcount: "viewCount",
    engagementscore: "engagementScore",
    engagementupdatedat: "engagementUpdatedAt",
    lastseen: "lastSeen",
    reactioncounts: "reactionCounts",
    ispinned: "isPinned",
  },
  conversations: {
    lastmessage: "lastMessage",
    lastmessageat: "lastMessageAt",
    lastmessagesender: "lastMessageSender",
    createdat: "createdAt",
    updatedat: "updatedAt",
    unreadcount: "unreadCount",
  },
  messages: {
    conversationid: "conversationId",
    senderid: "senderId",
    createdat: "createdAt",
    hiddenfor: "hiddenFor",
    replyto: "replyTo",
    ispinned: "isPinned",
  },
  notifications: {
    actoruid: "actorUid",
    recipientuid: "recipientUid",
    postid: "postId",
    quotepostid: "quotePostId",
    createdat: "createdAt",
  },
  user_relationships: {
    owneruid: "ownerUid",
    targetuid: "targetUid",
    createdat: "createdAt",
    updatedat: "updatedAt",
    followedat: "followedAt",
    initiatedby: "initiatedBy",
  },
  post_engagements: {
    postid: "postId",
    userid: "userId",
    createdat: "createdAt",
    updatedat: "updatedAt",
    lastengagedat: "lastEngagedAt",
  },
  user_meta: {
    createdat: "createdAt",
    updatedat: "updatedAt",
  },
  saved_posts: {
    postid: "postId",
    createdat: "createdAt",
  },
};

function createTimestampLike(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const wrapped = new Date(date.getTime());
  wrapped.toDate = function toDate() {
    return new Date(wrapped.getTime());
  };
  return wrapped;
}

function isTimestampField(table, field) {
  return Boolean(TIMESTAMP_FIELD_NAMES[table]?.has(field));
}

export function normalizeFieldName(field) {
  return String(field).toLowerCase();
}

export function normalizeWriteRow(table, row = {}) {
  const normalized = {};

  for (const [field, value] of Object.entries(row)) {
    const normalizedField = normalizeFieldName(field);

    if (
      isTimestampField(table, normalizedField) &&
      value &&
      typeof value === "object" &&
      typeof value.toDate === "function"
    ) {
      normalized[normalizedField] = value.toDate();
      continue;
    }

    if (
      isTimestampField(table, normalizedField) &&
      (value instanceof Date || typeof value === "number" || typeof value === "string")
    ) {
      const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
      if (!Number.isNaN(date.getTime())) {
        normalized[normalizedField] = date;
        continue;
      }
    }

    normalized[normalizedField] = value;
  }

  return normalized;
}

export function normalizeReadRow(table, row = {}) {
  const output = { ...row };
  const aliases = FIELD_ALIASES[table] ?? {};

  for (const [dbField, appField] of Object.entries(aliases)) {
    if (!Object.prototype.hasOwnProperty.call(row, dbField)) continue;

    const value = row[dbField];
    const normalizedValue = isTimestampField(table, dbField)
      ? createTimestampLike(value)
      : value;

    output[dbField] = normalizedValue;
    output[appField] = normalizedValue;
  }

  for (const field of TIMESTAMP_FIELD_NAMES[table] ?? []) {
    if (!Object.prototype.hasOwnProperty.call(row, field)) continue;

    const value = row[field];
    output[field] = createTimestampLike(value);
  }

  if (
    table === "user_meta" &&
    row.value &&
    typeof row.value === "object" &&
    !Array.isArray(row.value)
  ) {
    Object.assign(output, row.value);
    if (
      Object.prototype.hasOwnProperty.call(row.value, "feedauthorids") &&
      !Object.prototype.hasOwnProperty.call(output, "feedAuthorIds")
    ) {
      output.feedAuthorIds = row.value.feedauthorids;
    }
  }

  return output;
}
