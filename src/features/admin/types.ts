export const adminResources = [
  "characters",
  "conditions",
  "items",
  "locations",
  "events",
  "ambients",
  "endings",
  "achievements",
] as const;

export type AdminResource = (typeof adminResources)[number];
export type AdminSection = AdminResource | "rules" | "audit";

export interface ContentVersionDto {
  id: string;
  version: string;
  status: "draft" | "published" | "archived";
  changelog: string;
  revision: number;
  counts: Partial<Record<AdminResource, number>>;
}

export interface ContentEntryDto {
  id: string;
  key: string;
  enabled: boolean;
  version: number;
  content: Record<string, unknown>;
  dependencies?: Array<{ resource: AdminResource; key: string; path: string }>;
}

export interface PageDto<T> {
  items: T[];
  pageInfo: { hasNextPage: boolean; nextCursor: string | null };
}

export interface RulesDto {
  id: string;
  revision: number;
  content: Record<string, unknown>;
}

export interface AuditLogDto {
  id: string;
  action: string;
  entityType: string;
  entityKey: string;
  createdAt: string;
  before?: unknown;
  after?: unknown;
}

export interface CatalogItemDto {
  key: string;
  name?: string;
  enabled: boolean;
}

export type ContentCatalogDto = Record<AdminResource, CatalogItemDto[]>;

export type ContentValue = Record<string, unknown>;
