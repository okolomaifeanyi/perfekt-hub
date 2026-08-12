export type RelationshipTarget = {
  table: "user_relationships";
  idColumn: "id";
  baseFilters: Array<{
    field: string;
    op: "==";
    value: string;
  }>;
  row: Record<string, unknown>;
  docId: string;
  rowId: string;
  snapshotIdField: "owneruid" | "targetuid";
};

export declare function getRelationshipTarget(
  segments: string[]
): RelationshipTarget | null;
export declare function getRelationshipRow(
  segments: string[]
): Record<string, unknown> | null;
export declare function getRelationshipDocId(
  segments: string[]
): string | null;
export declare function buildRelationshipRowId(
  ownerUid: string,
  kind: string,
  targetUid?: string | null
): string;
export declare function normalizeRelationshipWriteRow(
  segments: string[],
  data?: Record<string, unknown>
): Record<string, unknown> | null;
