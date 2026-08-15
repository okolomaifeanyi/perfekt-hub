/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseAdminClient,
  getSupabaseBrowserClient,
} from "@/lib/supabase/client";
import { normalizeUnknownError } from "../supabase/error-utils.mjs";
import { getCurrentSupabaseClient } from "../supabase/request-context";
import {
  normalizeFieldName,
  normalizeReadRow,
  normalizeWriteRow,
} from "../supabase/firestore-schema.mjs";
import { getUsersTarget } from "./firestore-target.mjs";
import { normalizeRelationshipWriteRow } from "../supabase/relationship.mjs";

type WhereOp = "==" | "!=" | ">=" | "<=" | ">" | "<" | "in" | "array-contains";
type SortDir = "asc" | "desc";

// Firestore's loose document typing is intentional here; the app expects
// Firestore-style dynamic objects, so the shim keeps the same flexibility.
export type DocumentData = any;
export type FirestoreData = Record<string, unknown>;
export type FirestoreError = Error & { code?: string };

export class Timestamp {
  private readonly value: Date;

  constructor(
    public readonly seconds: number,
    public readonly nanoseconds: number
  ) {
    this.value = new Date(seconds * 1000 + Math.floor(nanoseconds / 1_000_000));
  }

  static now() {
    return Timestamp.fromDate(new Date());
  }

  static fromDate(date: Date) {
    return new Timestamp(
      Math.floor(date.getTime() / 1000),
      (date.getTime() % 1000) * 1_000_000
    );
  }

  toDate() {
    return new Date(this.value.getTime());
  }

  toJSON() {
    return this.toDate().toISOString();
  }
}

const SERVER_TIMESTAMP = Symbol("serverTimestamp");
const INCREMENT = Symbol("increment");
const ARRAY_UNION = Symbol("arrayUnion");
const ARRAY_REMOVE = Symbol("arrayRemove");

type Transform =
  | { kind: typeof SERVER_TIMESTAMP }
  | { kind: typeof INCREMENT; amount: number }
  | { kind: typeof ARRAY_UNION; values: unknown[] }
  | { kind: typeof ARRAY_REMOVE; values: unknown[] };

function isTransform(value: unknown): value is Transform {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    typeof (value as { kind?: unknown }).kind === "symbol"
  );
}

export const FieldValue = {
  serverTimestamp: () => ({ kind: SERVER_TIMESTAMP } as const),
  increment: (amount: number) => ({ kind: INCREMENT, amount } as const),
  arrayUnion: (...values: unknown[]) =>
    ({ kind: ARRAY_UNION, values } as const),
  arrayRemove: (...values: unknown[]) =>
    ({ kind: ARRAY_REMOVE, values } as const),
};

export const serverTimestamp = FieldValue.serverTimestamp;
export const increment = FieldValue.increment;
export const arrayUnion = FieldValue.arrayUnion;
export const arrayRemove = FieldValue.arrayRemove;

export type DocumentSnapshot<T = DocumentData> = {
  id: string;
  exists: () => boolean;
  data: () => T;
  get: (field: string) => any;
  ref: DocumentRef;
};

export type DocumentReference = DocumentRef;

export type WriteBatch = {
  set: (ref: DocumentRef, data: FirestoreData, options?: { merge?: boolean }) => WriteBatch;
  update: (ref: DocumentRef, data: FirestoreData) => WriteBatch;
  delete: (ref: DocumentRef) => WriteBatch;
  commit: () => Promise<void>;
};

export type QueryDocumentSnapshot<T = DocumentData> = DocumentSnapshot<T> & {
  exists: () => true;
  data: () => T;
};

export type QuerySnapshot<T = DocumentData> = {
  docs: Array<QueryDocumentSnapshot<T>>;
  size: number;
  empty: boolean;
  forEach: (callback: (doc: QueryDocumentSnapshot<T>) => void) => void;
  docChanges: () => Array<{
    type: "added" | "modified" | "removed";
    doc: QueryDocumentSnapshot<T>;
  }>;
};

type QueryConstraint =
  | { kind: "where"; field: string; op: WhereOp; value: unknown }
  | { kind: "orderBy"; field: string; dir: SortDir }
  | { kind: "limit"; value: number }
  | { kind: "startAfter"; value: unknown }
  | { kind: "startAt"; value: unknown }
  | { kind: "endAt"; value: unknown }
  | { kind: "select"; value: string[] | null };

type BaseFilter = {
  field: string;
  op: WhereOp;
  value: unknown;
};

type Target = {
  table: string;
  idColumn: string;
  baseFilters: BaseFilter[];
  relationship?: {
    docId: string;
    rowId: string;
    snapshotIdField: string;
    row: Record<string, unknown>;
  };
  docDefaults?: () => Record<string, unknown>;
};

function clone<T>(value: T): T {
  if (value instanceof Date) {
    const clonedDate = new Date(value.getTime()) as Date & { toDate?: () => Date };
    if (typeof (value as Date & { toDate?: unknown }).toDate === "function") {
      clonedDate.toDate = function toDate() {
        return new Date(clonedDate.getTime());
      };
    }
    return clonedDate as T;
  }
  if (Array.isArray(value)) return value.map(clone) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [
        key,
        clone(child),
      ])
    ) as T;
  }
  return value;
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (child !== undefined) out[key] = child;
  }
  return out as T;
}

function getClient(): SupabaseClient {
  const contextualClient = getCurrentSupabaseClient();
  if (contextualClient) {
    return contextualClient as SupabaseClient;
  }

  return typeof window === "undefined"
    ? getSupabaseAdminClient()
    : getSupabaseBrowserClient();
}

function toComparable(value: unknown): number | string | boolean | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Timestamp) return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" || typeof value === "string" || typeof value === "boolean")
    return value;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    try {
      const maybeDate = (value as { toDate: () => Date }).toDate();
      return maybeDate.getTime();
    } catch {
      return null;
    }
  }
  return null;
}

function compare(a: unknown, b: unknown): number {
  const left = toComparable(a);
  const right = toComparable(b);

  if (left === null && right === null) return 0;
  if (left === null) return -1;
  if (right === null) return 1;

  if (typeof left === "string" && typeof right === "string") {
    return left.localeCompare(right);
  }

  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }

  return Number(left) - Number(right);
}

function normalizeValue(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === "object") {
    if (isTransform(value)) return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [
        key,
        normalizeValue(child),
      ])
    );
  }
  return value;
}

function applyTransform(current: unknown, value: unknown): unknown {
  if (isTransform(value)) {
    if (value.kind === SERVER_TIMESTAMP) return new Date();
    if (value.kind === INCREMENT) {
      const currentNumber = typeof current === "number" ? current : 0;
      return currentNumber + value.amount;
    }
    if (value.kind === ARRAY_UNION) {
      const currentArray = Array.isArray(current) ? current : [];
      const combined = [...currentArray];
      for (const entry of value.values) {
        if (!combined.some(existing => JSON.stringify(existing) === JSON.stringify(entry))) {
          combined.push(entry);
        }
      }
      return combined;
    }
    if (value.kind === ARRAY_REMOVE) {
      const currentArray = Array.isArray(current) ? current : [];
      return currentArray.filter(
        entry =>
          !value.values.some(removeValue => JSON.stringify(removeValue) === JSON.stringify(entry))
      );
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (current && typeof current === "object" && !Array.isArray(current)) {
      return {
        ...(current as Record<string, unknown>),
        ...(normalizeValue(value) as Record<string, unknown>),
      };
    }
  }

  return normalizeValue(value);
}

function applyPathUpdate(
  target: Record<string, unknown>,
  path: string,
  value: unknown
) {
  const segments = path.split(".");
  let current: Record<string, unknown> = target;

  for (let index = 0; index < segments.length - 1; index++) {
    const segment = segments[index];
    const next = current[segment];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }

  const leaf = segments[segments.length - 1];
  current[leaf] = applyTransform(current[leaf], value);
}

function mergeDeep<T extends Record<string, unknown>>(base: T, patch: Record<string, unknown>): T {
  const result: Record<string, unknown> = clone(base);

  for (const [key, value] of Object.entries(patch)) {
    if (key.includes(".")) {
      applyPathUpdate(result, key, value);
      continue;
    }

    const existing = result[key];
    result[key] = applyTransform(existing, value) as unknown;
  }

  return stripUndefined(result) as T;
}

function getBaseTarget(segments: string[]): Target {
  const [root, one, two] = segments;

  if (root === "users") {
    const userTarget = getUsersTarget(segments);
    if (userTarget) {
      return userTarget as Target;
    }
  }

  if (root === "posts") {
    if (segments.length === 1) {
      return { table: "posts", idColumn: "id", baseFilters: [] };
    }

    if (two === "engagements" || two === "reactions" || two === "views") {
      return {
        table: "post_engagements",
        idColumn: "id",
        baseFilters: [{ field: "postId", op: "==", value: one }],
      };
    }
  }

  if (root === "conversations") {
    if (segments.length === 1) {
      return { table: "conversations", idColumn: "id", baseFilters: [] };
    }

    if (two === "messages") {
      return {
        table: "messages",
        idColumn: "id",
        baseFilters: [{ field: "conversationId", op: "==", value: one }],
      };
    }
  }

  if (root === "notifications") {
    return { table: "notifications", idColumn: "id", baseFilters: [] };
  }

  return { table: root, idColumn: "id", baseFilters: [] };
}

function encodeId(segments: string[]) {
  return segments.join("/");
}

function docIdForTarget(target: Target, segments: string[], explicitId?: string) {
  if (target.relationship) return target.relationship.rowId;
  if (explicitId) return explicitId;
  const [, one, two, three] = segments;

  if (target.table === "users") return one ?? encodeId(segments);
  if (target.table === "posts") return one ?? encodeId(segments);
  if (target.table === "conversations") return one ?? encodeId(segments);
  if (target.table === "messages") return explicitId ?? encodeId(segments);
  if (target.table === "notifications") return explicitId ?? encodeId(segments);
  if (target.table === "user_meta") {
    return `uid:${one ?? ""}|key:${three ?? ""}`;
  }
  if (target.table === "saved_posts") {
    return `uid:${one ?? ""}|postid:${three ?? ""}`;
  }
  if (target.table === "post_engagements") {
    if (two === "views" || two === "engagements" || two === "reactions") {
      return explicitId ?? "self";
    }
  }
  if (target.table === "user_relationships") {
    return explicitId ?? encodeId(segments);
  }

  return explicitId ?? encodeId(segments);
}

function withBaseFilters(
  queryBuilder: any,
  target: Target
) {
  return target.baseFilters.reduce((builder, filter) => {
    const query = builder as any;
    const field = normalizeFieldName(filter.field);
    if (filter.op === "==") return query.eq(field, filter.value as never);
    if (filter.op === "!=") return query.neq(field, filter.value as never);
    if (filter.op === ">=") return query.gte(field, filter.value as never);
    if (filter.op === "<=") return query.lte(field, filter.value as never);
    if (filter.op === ">") return query.gt(field, filter.value as never);
    if (filter.op === "<") return query.lt(field, filter.value as never);
    if (filter.op === "in" && Array.isArray(filter.value))
      return query.in(field, filter.value as never[]);
    if (filter.op === "array-contains" && Array.isArray(filter.value))
      return query.contains(field, filter.value as never[]);
    return query;
  }, queryBuilder);
}

export class QueryRef {
  public readonly constraints: QueryConstraint[];

  constructor(
    public readonly segments: string[],
    constraints: QueryConstraint[] = []
  ) {
    this.constraints = constraints;
  }

  cloneWith(constraint: QueryConstraint) {
    return new QueryRef(this.segments, [...this.constraints, constraint]);
  }

  where(field: string, op: WhereOp, value: unknown) {
    return this.cloneWith({ kind: "where", field, op, value });
  }

  orderBy(field: string, dir: SortDir = "asc") {
    return this.cloneWith({ kind: "orderBy", field, dir });
  }

  limit(value: number) {
    return this.cloneWith({ kind: "limit", value });
  }

  startAfter(value: unknown) {
    return this.cloneWith({ kind: "startAfter", value });
  }

  startAt(value: unknown) {
    return this.cloneWith({ kind: "startAt", value });
  }

  endAt(value: unknown) {
    return this.cloneWith({ kind: "endAt", value });
  }

  select(...fields: string[]) {
    return this.cloneWith({ kind: "select", value: fields.length ? fields : null });
  }

  doc(id?: string) {
    // Match the top-level doc() helper: a single id containing "/" (e.g.
    // usersRef.doc(`${uid}/following/${targetUid}`)) is a full relative path,
    // not one opaque segment — splitting it is required for callers to reach
    // nested collections instead of silently writing into the top-level one.
    if (id && id.includes("/")) {
      return new DocumentRef([...this.segments, ...id.split("/")]);
    }
    return new DocumentRef([...this.segments, id ?? crypto.randomUUID()]);
  }

  async get() {
    return getDocs(this);
  }
}

export class DocumentRef {
  constructor(public readonly segments: string[]) {}

  get id() {
    return this.segments[this.segments.length - 1] ?? "";
  }

  get path() {
    return this.segments.join("/");
  }

  collection(subpath: string) {
    return new CollectionRef([...this.segments, subpath]);
  }

  async get() {
    return getDoc(this);
  }

  async set(data: FirestoreData, options?: { merge?: boolean }) {
    return setDoc(this, data, options);
  }

  async update(data: FirestoreData) {
    return updateDoc(this, data);
  }

  async delete() {
    return deleteDoc(this);
  }

  toString() {
    return this.segments.join("/");
  }
}

export class CollectionRef extends QueryRef {
  constructor(segments: string[], constraints: QueryConstraint[] = []) {
    super(segments, constraints);
  }
}

function createResultSnapshot(
  rows: Record<string, unknown>[],
  ref: QueryRef,
  target: Target
): QuerySnapshot {
  const docs = rows.map(row => {
    const id = target.relationship
      ? String(
          (row as Record<string, unknown>)[target.relationship.snapshotIdField] ??
            (row as Record<string, unknown>).id ??
            (row as Record<string, unknown>).uid ??
            ""
        )
      : target.table === "user_meta"
        ? String((row as Record<string, unknown>).key ?? (row as Record<string, unknown>).id ?? "")
      : String((row as Record<string, unknown>).id ?? (row as Record<string, unknown>).uid ?? "");
    const snapshot: QueryDocumentSnapshot = {
      id,
      exists: () => true,
      data: () => clone(row),
      get: (field: string) => (clone(row) as Record<string, unknown>)[field],
      ref: new DocumentRef([...ref.segments, id]),
    };
    return snapshot;
  });

  return {
    docs,
    size: docs.length,
    empty: docs.length === 0,
    forEach(callback) {
      docs.forEach(callback);
    },
    docChanges() {
      return docs.map(doc => ({ type: "added" as const, doc }));
    },
  };
}

async function fetchRows(ref: QueryRef) {
  const target = getBaseTarget(ref.segments);
  let queryBuilder: any = withBaseFilters(
    getClient().from(target.table).select("*"),
    target
  );

  const wheres = ref.constraints.filter((constraint): constraint is Extract<QueryConstraint, { kind: "where" }> => constraint.kind === "where");
  const orderBys = ref.constraints.filter((constraint): constraint is Extract<QueryConstraint, { kind: "orderBy" }> => constraint.kind === "orderBy");

  for (const whereConstraint of wheres) {
    const field = normalizeFieldName(whereConstraint.field);
    if (whereConstraint.op === "==") queryBuilder = queryBuilder.eq(field, whereConstraint.value as never);
    if (whereConstraint.op === "!=") queryBuilder = queryBuilder.neq(field, whereConstraint.value as never);
    if (whereConstraint.op === ">=") queryBuilder = queryBuilder.gte(field, whereConstraint.value as never);
    if (whereConstraint.op === "<=") queryBuilder = queryBuilder.lte(field, whereConstraint.value as never);
    if (whereConstraint.op === ">") queryBuilder = queryBuilder.gt(field, whereConstraint.value as never);
    if (whereConstraint.op === "<") queryBuilder = queryBuilder.lt(field, whereConstraint.value as never);
    if (whereConstraint.op === "in" && Array.isArray(whereConstraint.value)) queryBuilder = queryBuilder.in(field, whereConstraint.value as never[]);
    if (whereConstraint.op === "array-contains" && Array.isArray(whereConstraint.value)) {
      queryBuilder = queryBuilder.contains(field, whereConstraint.value as never[]);
    }
  }

  for (const orderByConstraint of orderBys) {
    queryBuilder = queryBuilder.order(normalizeFieldName(orderByConstraint.field), {
      ascending: orderByConstraint.dir === "asc",
    });
  }

  const { data, error } = await queryBuilder;
  if (error) throw error;

  let rows: Record<string, unknown>[] = (data ?? []).map((row: unknown) =>
    normalizeReadRow(target.table, {
      ...(row as Record<string, unknown>),
    }) as Record<string, unknown>
  );

  const remainingConstraints = ref.constraints.filter(
    constraint => constraint.kind === "startAfter" || constraint.kind === "limit"
  );

  const startAfterConstraint = remainingConstraints.find(
    (constraint): constraint is Extract<QueryConstraint, { kind: "startAfter" }> =>
      constraint.kind === "startAfter"
  );
  const startAtConstraint = ref.constraints.find(
    (constraint): constraint is Extract<QueryConstraint, { kind: "startAt" }> =>
      constraint.kind === "startAt"
  );
  const endAtConstraint = ref.constraints.find(
    (constraint): constraint is Extract<QueryConstraint, { kind: "endAt" }> =>
      constraint.kind === "endAt"
  );
  const limitConstraint = remainingConstraints.find(
    (constraint): constraint is Extract<QueryConstraint, { kind: "limit" }> =>
      constraint.kind === "limit"
  );

  if (startAfterConstraint) {
    const orderField = orderBys[0]?.field ?? "createdAt";
    const cursorValue = startAfterConstraint.value;
    rows = rows.filter(row => compare(row[orderField], cursorValue) < 0);
  }

  if (startAtConstraint) {
    const orderField = orderBys[0]?.field ?? "createdAt";
    rows = rows.filter(row => compare(row[orderField], startAtConstraint.value) >= 0);
  }

  if (endAtConstraint) {
    const orderField = orderBys[0]?.field ?? "createdAt";
    rows = rows.filter(row => compare(row[orderField], endAtConstraint.value) <= 0);
  }

  if (limitConstraint) {
    rows = rows.slice(0, limitConstraint.value);
  }

  return rows;
}

export async function getDocs(ref: QueryRef) {
  const target = getBaseTarget(ref.segments);
  const rows = await fetchRows(ref);
  return createResultSnapshot(rows, ref, target);
}

export async function getDoc(ref: DocumentRef) {
  const target = getBaseTarget(ref.segments);
  const docId = docIdForTarget(target, ref.segments, ref.segments.at(-1));
  const queryBuilder = withBaseFilters(getClient().from(target.table).select("*"), target).eq(
    target.idColumn,
    docId as never
  );
  const { data, error } = await queryBuilder.limit(1).maybeSingle();
  if (error && error.code !== "PGRST116") throw error;

  const row = data
    ? (normalizeReadRow(target.table, {
        ...(data as Record<string, unknown>),
      }) as Record<string, unknown>)
    : null;
  return {
    id: target.relationship ? ref.id : docId,
    exists: () => !!row,
    data: () => (row ? clone(row) : undefined),
    get: (field: string) => (row ? (clone(row) as Record<string, unknown>)[field] : undefined),
    ref,
  } as DocumentSnapshot;
}

// Firestore-style transforms (increment/arrayUnion/arrayRemove) and dotted
// nested-field paths (e.g. "reactionCounts.like") only resolve correctly when
// applied against the document's real current value — otherwise increment(1)
// always resolves to 1 instead of accumulating, and a dotted-path write wipes
// out sibling keys in the same JSON column instead of patching just one key.
// `existingRow` lets callers seed that real state in before the merge runs.
function resolveRowForSet(
  ref: DocumentRef,
  data: FirestoreData,
  existingRow?: Record<string, unknown> | null
) {
  const target = getBaseTarget(ref.segments);
  const docId = docIdForTarget(target, ref.segments, ref.segments.at(-1));
  const base: Record<string, unknown> = {
    ...(existingRow ?? {}),
    [target.idColumn]: docId,
    ...target.baseFilters.reduce<Record<string, unknown>>((acc, filter) => {
      if (filter.op === "==") acc[normalizeFieldName(filter.field)] = filter.value;
      return acc;
    }, {}),
  };

  if (target.relationship) {
    const row = normalizeRelationshipWriteRow(ref.segments, data);
    if (!row) {
      return { target, docId, row: mergeDeep(base, normalizeWriteRow(target.table, data)) };
    }

    return { target, docId: row.id as string, row };
  }

  if (target.table === "user_meta") {
    base.uid = ref.segments[1];
    base.key = ref.segments[3];

    const normalizedData = normalizeWriteRow(target.table, data);
    const valuePatch: Record<string, unknown> = {};
    const row = clone(base);

    for (const [originalField, originalValue] of Object.entries(data)) {
      const field = normalizeFieldName(originalField);

      if (field === "uid" || field === "key" || field === "createdat" || field === "updatedat" || field === "id") {
        row[field] = normalizedData[field] ?? originalValue;
        continue;
      }

      if (field === "value" && originalValue && typeof originalValue === "object" && !Array.isArray(originalValue)) {
        Object.assign(valuePatch, originalValue as Record<string, unknown>);
        continue;
      }

      valuePatch[originalField] = originalValue;
    }

    if (Object.keys(valuePatch).length > 0) {
      row.value = {
        ...(row.value && typeof row.value === "object" && !Array.isArray(row.value)
          ? row.value
          : {}),
        ...valuePatch,
      };
    }

    return { target, docId, row };
  }

  if (target.table === "post_engagements") {
    base.postid = ref.segments[1];
    base.userid = docId;
  }

  if (target.table === "saved_posts") {
    base.uid = ref.segments[1];
    base.postid = ref.segments[3];
  }

  if (target.table === "messages") {
    base.conversationid = ref.segments[1];
  }

  return { target, docId, row: mergeDeep(base, normalizeWriteRow(target.table, data)) };
}

export async function setDoc(ref: DocumentRef, data: FirestoreData, options?: { merge?: boolean }) {
  const client = getClient();
  // Resolve target/docId first (data irrelevant here) so the existing row can
  // be fetched before transforms are resolved against it.
  const { target, docId } = resolveRowForSet(ref, {});

  const existing = await client
    .from(target.table)
    .select("*")
    .eq(target.idColumn, docId as never)
    .maybeSingle();

  const { row } = resolveRowForSet(
    ref,
    data,
    options?.merge ? (existing.data as Record<string, unknown> | null) : null
  );

  const { error } = await client.from(target.table).upsert(stripUndefined(row), {
    onConflict: target.idColumn,
  });
  if (error) throw error;
}

function hasTransformOrNestedPath(data: FirestoreData): boolean {
  return Object.entries(data).some(([key, value]) => key.includes(".") || isTransform(value));
}

export async function updateDoc(ref: DocumentRef, data: FirestoreData) {
  const client = getClient();
  const { target, docId } = resolveRowForSet(ref, {});

  let existingRow: Record<string, unknown> | null = null;
  if (hasTransformOrNestedPath(data)) {
    const existing = await client
      .from(target.table)
      .select("*")
      .eq(target.idColumn, docId as never)
      .maybeSingle();
    existingRow = (existing.data as Record<string, unknown> | null) ?? null;
  }

  const { row } = resolveRowForSet(ref, data, existingRow);
  const { error } = await client
    .from(target.table)
    .update(stripUndefined(row))
    .eq(target.idColumn, docId as never);
  if (error) throw error;
}

export async function deleteDoc(ref: DocumentRef) {
  const { target, docId } = resolveRowForSet(ref, {});
  const client = getClient();
  const { error } = await client.from(target.table).delete().eq(target.idColumn, docId as never);
  if (error) throw error;
}

export async function addDoc(ref: CollectionRef, data: FirestoreData) {
  const docRef = ref.doc();
  await setDoc(docRef, data, { merge: false });
  return docRef;
}

export function collection(_root: unknown, ...segments: string[]) {
  if (segments.length === 1 && segments[0].includes("/")) {
    return new CollectionRef(segments[0].split("/"));
  }

  return new CollectionRef(segments);
}

export function doc(_root: unknown, ...segments: string[]) {
  if (segments.length === 1 && segments[0].includes("/")) {
    return new DocumentRef(segments[0].split("/"));
  }

  return new DocumentRef(segments);
}

export function query(ref: CollectionRef | QueryRef, ...constraints: QueryConstraint[]) {
  return new QueryRef(ref.segments, [...ref.constraints, ...constraints]);
}

export function where(field: string, op: WhereOp, value: unknown) {
  return { kind: "where", field, op, value } as const;
}

export function orderBy(field: string, dir: SortDir = "asc") {
  return { kind: "orderBy", field, dir } as const;
}

export function limit(value: number) {
  return { kind: "limit", value } as const;
}

export function startAfter(value: unknown) {
  return { kind: "startAfter", value } as const;
}

export function startAt(value: unknown) {
  return { kind: "startAt", value } as const;
}

export function endAt(value: unknown) {
  return { kind: "endAt", value } as const;
}

export function select(...fields: string[]) {
  return { kind: "select", value: fields.length ? fields : null } as const;
}

export function getFirestore() {
  return {
    collection: (...segments: string[]) => collection(null, ...segments),
    collectionGroup: (subcollection: string) =>
      collection(null, subcollection),
    doc: (...segments: string[]) => doc(null, ...segments),
    batch: () => writeBatch(),
    runTransaction: (callback: (transaction: Transaction) => Promise<unknown>) =>
      runTransaction(callback),
  };
}

export function writeBatch(_db?: unknown) {
  void _db;
  const operations: Array<() => Promise<void>> = [];

  return {
    set(ref: DocumentRef, data: FirestoreData, options?: { merge?: boolean }) {
      operations.push(() => setDoc(ref, data, options));
      return this;
    },
    update(ref: DocumentRef, data: FirestoreData) {
      operations.push(() => updateDoc(ref, data));
      return this;
    },
    delete(ref: DocumentRef) {
      operations.push(() => deleteDoc(ref));
      return this;
    },
    async commit() {
      for (const operation of operations) {
        await operation();
      }
    },
  };
}

class Transaction {
  async get(ref: DocumentRef) {
    return getDoc(ref);
  }

  set(ref: DocumentRef, data: FirestoreData, options?: { merge?: boolean }) {
    return setDoc(ref, data, options);
  }

  update(ref: DocumentRef, data: FirestoreData) {
    return updateDoc(ref, data);
  }

  delete(ref: DocumentRef) {
    return deleteDoc(ref);
  }
}

export async function runTransaction<T>(
  callback: (transaction: Transaction) => Promise<T>
) {
  const transaction = new Transaction();
  return callback(transaction);
}

// Supabase Realtime's `filter` option on a postgres_changes subscription
// only supports a single `column=eq.value` condition — it can't express
// the multi-clause where()/orderBy()/limit() combinations these queries
// build. Rather than reimplement that filtering against raw realtime
// payloads (a second, easy-to-drift-from-the-real-query implementation),
// this only uses realtime as a wake-up signal — the actual data still
// comes from the exact same getDoc()/getDocs() call poll() already made,
// which applies every clause correctly by construction. A single equality
// filter narrows which changes bother waking this listener at all; with
// zero or multiple filters, it just subscribes to the whole table, which
// still wakes on the right changes (among some extra irrelevant ones) —
// the poll after any wake-up correctly reflects only what the query
// itself asked for either way.
function buildRealtimeFilter(
  ref: DocumentRef | QueryRef,
  target: Target
): string | undefined {
  if (ref instanceof DocumentRef) {
    // Relationship-backed docs (followers/following/friends) use a
    // composite key, not a single real column — no simple filter maps to
    // that, so this falls back to whole-table (still correct, just wider).
    if (target.relationship) return undefined;
    const docId = docIdForTarget(target, ref.segments, ref.segments.at(-1));
    if (!docId) return undefined;
    return `${normalizeFieldName(target.idColumn)}=eq.${docId}`;
  }

  const filters: BaseFilter[] = [...target.baseFilters];
  for (const constraint of ref.constraints) {
    if (constraint.kind === "where" && constraint.op === "==") {
      filters.push({ field: constraint.field, op: "==", value: constraint.value });
    }
  }

  if (filters.length !== 1) return undefined;
  const [filter] = filters;
  if (filter.value === undefined || filter.value === null) return undefined;
  return `${normalizeFieldName(filter.field)}=eq.${filter.value}`;
}

export function onSnapshot(
  ref: QueryRef,
  onNext: (snapshot: QuerySnapshot) => void,
  onError?: (error: Error) => void
): () => void;
export function onSnapshot(
  ref: DocumentRef,
  onNext: (snapshot: DocumentSnapshot) => void,
  onError?: (error: Error) => void
): () => void;
export function onSnapshot(
  ref: any,
  onNext: (snapshot: any) => void,
  onError?: (error: Error) => void
) {
  let active = true;
  let lastPayload = "";
  let lastDocsById = new Map<string, string>();

  const poll = async () => {
    try {
      const snapshot =
        ref instanceof DocumentRef ? await getDoc(ref) : await getDocs(ref);
      const payload = JSON.stringify(
        "docs" in snapshot
          ? snapshot.docs.map(docSnapshot => docSnapshot.data())
          : snapshot.data()
      );

      if (payload !== lastPayload) {
        lastPayload = payload;
        if ("docs" in snapshot) {
          const currentDocsById = new Map(
            snapshot.docs.map(docSnapshot => [
              docSnapshot.id,
              JSON.stringify(docSnapshot.data()),
            ])
          );
          (snapshot as QuerySnapshot).docChanges = () => {
            const changes: Array<{
              type: "added" | "modified" | "removed";
              doc: QueryDocumentSnapshot;
            }> = [];

            for (const docSnapshot of snapshot.docs) {
              const previousSerialized = lastDocsById.get(docSnapshot.id);
              const currentSerialized = currentDocsById.get(docSnapshot.id);

              if (previousSerialized === undefined) {
                changes.push({ type: "added", doc: docSnapshot });
              } else if (previousSerialized !== currentSerialized) {
                changes.push({ type: "modified", doc: docSnapshot });
              }
            }

            return changes;
          };
          lastDocsById = currentDocsById;
        }
        onNext(snapshot);
      }
    } catch (error) {
      onError?.(normalizeUnknownError(error, "Realtime listener failed."));
    }
  };

  void poll();

  // Safety net only — every listener across the app used to poll on this
  // same 3s timer unconditionally, which is what actually generated the
  // request volume (confirmed live: a whole page's worth of listeners all
  // firing in lockstep every 3 seconds, whether or not anything had
  // changed). The realtime subscription below is the primary trigger now;
  // this just catches a missed/dropped realtime event.
  const interval = setInterval(() => {
    if (active) void poll();
  }, 30000);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleRealtimePoll = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    // Coalesces bursts (e.g. several rows changing at once) into one
    // re-fetch instead of one per row event.
    debounceTimer = setTimeout(() => {
      if (active) void poll();
    }, 250);
  };

  const target = getBaseTarget(ref.segments);
  const realtimeFilter = buildRealtimeFilter(ref, target);
  let channel: ReturnType<SupabaseClient["channel"]> | null = null;
  try {
    channel = getClient()
      .channel(`onSnapshot:${target.table}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: target.table,
          ...(realtimeFilter ? { filter: realtimeFilter } : {}),
        },
        scheduleRealtimePoll
      )
      .subscribe();
  } catch (err) {
    // Realtime is additive — if the channel can't be established (offline,
    // misconfigured, table not in the publication), the interval above
    // still keeps this listener working, just on a slower cadence.
    console.error("onSnapshot: realtime subscription failed, falling back to polling only:", err);
  }

  return () => {
    active = false;
    clearInterval(interval);
    if (debounceTimer) clearTimeout(debounceTimer);
    if (channel) void getClient().removeChannel(channel);
  };
}

export type { QueryConstraint };
