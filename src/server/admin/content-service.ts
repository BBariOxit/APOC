import "server-only";

import { Types, type ClientSession } from "mongoose";

import {
  contentResourceConfigs,
  getContentResourceConfig,
  pickContent,
  type ContentRecord,
  type ContentResource,
} from "@/server/admin/content-registry";
import { writeAdminAudit } from "@/server/admin/audit";
import { findContentDependencies } from "@/server/admin/references";
import {
  createContentRequestSchema,
  bulkContentRequestSchema,
  duplicateContentRequestSchema,
  updateContentRequestSchema,
} from "@/server/admin/schemas";
import { connectToDatabase } from "@/server/db/mongoose";
import { ContentVersionModel } from "@/server/db/models";
import { ApiError } from "@/server/http/api-error";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeForJson(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Types.ObjectId) {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(normalizeForJson);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as ContentRecord).map(([key, child]) => [
        key,
        normalizeForJson(child),
      ]),
    );
  }
  return value;
}

function toContentDto(record: ContentRecord, resource: ContentResource) {
  const config = contentResourceConfigs[resource];
  return normalizeForJson({
    id: record._id,
    key: record.key,
    enabled: record.enabled,
    version: record.__v ?? 0,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    content: pickContent(record, config.contentFields),
  }) as ContentRecord;
}

async function requireDraftVersion(
  contentVersionId: string,
  session?: ClientSession,
): Promise<void> {
  const version = await ContentVersionModel.findById(contentVersionId)
    .session(session ?? null)
    .select("status")
    .lean()
    .exec();

  if (!version) {
    throw new ApiError(404, "VERSION_NOT_FOUND", "Content version not found");
  }
  if (version.status !== "draft") {
    throw new ApiError(
      409,
      "VERSION_IMMUTABLE",
      "Only draft content versions can be changed",
    );
  }
}

export interface ContentListOptions {
  cursor?: string;
  limit?: number;
  q?: string;
  enabled?: boolean;
  tag?: string;
  filters?: Record<string, string | boolean>;
}

export async function listContent(
  contentVersionId: string,
  resource: ContentResource,
  options: ContentListOptions,
) {
  const config = contentResourceConfigs[resource];
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
  const query: ContentRecord = { contentVersionId };

  if (options.cursor) {
    if (!Types.ObjectId.isValid(options.cursor)) {
      throw new ApiError(400, "VALIDATION_ERROR", "cursor is invalid");
    }
    query._id = { $lt: new Types.ObjectId(options.cursor) };
  }
  if (options.enabled !== undefined) {
    query.enabled = options.enabled;
  }
  if (options.tag) {
    query.tags = options.tag;
  }
  if (options.q) {
    const q = options.q.trim().slice(0, 100);
    if (q) {
      const regex = new RegExp(escapeRegex(q), "i");
      query.$or = [{ key: regex }, { name: regex }];
    }
  }
  for (const [field, value] of Object.entries(options.filters ?? {})) {
    if (config.filterFields.includes(field)) {
      query[field] = value;
    }
  }

  const documents = (await config.model
    .find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean()
    .exec()) as ContentRecord[];
  const hasNextPage = documents.length > limit;
  const page = documents.slice(0, limit);

  return {
    items: page.map((record) => toContentDto(record, resource)),
    pageInfo: {
      hasNextPage,
      nextCursor: hasNextPage
        ? String(page[page.length - 1]?._id ?? "")
        : null,
    },
  };
}

export async function getContent(
  contentVersionId: string,
  resource: ContentResource,
  key: string,
) {
  const config = contentResourceConfigs[resource];
  const document = (await config.model
    .findOne({ contentVersionId, key })
    .lean()
    .exec()) as ContentRecord | null;

  if (!document) {
    throw new ApiError(404, "CONTENT_NOT_FOUND", "Content not found");
  }

  const dependencies = await findContentDependencies(
    contentVersionId,
    resource,
    key,
  );
  return {
    ...toContentDto(document, resource),
    dependencies,
  };
}

export async function createContent(
  contentVersionId: string,
  resource: ContentResource,
  adminUserId: string,
  input: unknown,
) {
  const request = createContentRequestSchema.parse(input);
  const config = contentResourceConfigs[resource];
  const content = config.schema.parse(request.content) as ContentRecord;
  const mongoose = await connectToDatabase();
  const session = await mongoose.startSession();
  let result: unknown;

  try {
    await session.withTransaction(async () => {
      await requireDraftVersion(contentVersionId, session);
      const document = new config.model({
        contentVersionId,
        key: request.key,
        enabled: request.enabled,
        createdBy: adminUserId,
        ...content,
      });
      await document.save({ session });
      const record = document.toObject() as ContentRecord;
      await writeAdminAudit({
        adminUserId,
        action: "create",
        entityType: config.entityType,
        entityKey: request.key,
        contentVersionId,
        after: record,
        session,
      });
      result = toContentDto(record, resource);
    });
  } finally {
    await session.endSession();
  }
  return result;
}

export async function updateContent(
  contentVersionId: string,
  resource: ContentResource,
  key: string,
  adminUserId: string,
  input: unknown,
) {
  const request = updateContentRequestSchema.parse(input);
  const config = contentResourceConfigs[resource];
  const content =
    request.content === undefined
      ? undefined
      : (config.schema.parse(request.content) as ContentRecord);
  const mongoose = await connectToDatabase();
  const session = await mongoose.startSession();
  let result: unknown;

  try {
    await session.withTransaction(async () => {
      await requireDraftVersion(contentVersionId, session);
      const document = await config.model
        .findOne({ contentVersionId, key })
        .session(session)
        .exec();
      if (!document) {
        throw new ApiError(404, "CONTENT_NOT_FOUND", "Content not found");
      }
      if (Number(document.get("__v") ?? 0) !== request.expectedVersion) {
        throw new ApiError(
          409,
          "EDIT_CONFLICT",
          "Content was changed by another administrator",
        );
      }

      const before = document.toObject();
      if (request.enabled !== undefined) {
        document.set("enabled", request.enabled);
      }
      if (content) {
        config.contentFields.forEach((field) =>
          document.set(field, content[field]),
        );
      }
      document.increment();
      await document.save({ session });
      const after = document.toObject() as ContentRecord;
      await writeAdminAudit({
        adminUserId,
        action: "update",
        entityType: config.entityType,
        entityKey: key,
        contentVersionId,
        before,
        after,
        session,
      });
      result = toContentDto(after, resource);
    });
  } finally {
    await session.endSession();
  }
  return result;
}

export async function deleteContent(
  contentVersionId: string,
  resource: ContentResource,
  key: string,
  adminUserId: string,
): Promise<void> {
  const config = contentResourceConfigs[resource];
  const mongoose = await connectToDatabase();
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await requireDraftVersion(contentVersionId, session);
      const document = await config.model
        .findOne({ contentVersionId, key })
        .session(session)
        .exec();
      if (!document) {
        throw new ApiError(404, "CONTENT_NOT_FOUND", "Content not found");
      }

      const dependencies = await findContentDependencies(
        contentVersionId,
        resource,
        key,
        session,
      );
      if (dependencies.length > 0) {
        throw new ApiError(
          409,
          "CONTENT_IN_USE",
          "Content is referenced by other definitions",
          { dependencies },
        );
      }

      const before = document.toObject();
      await document.deleteOne({ session });
      await writeAdminAudit({
        adminUserId,
        action: "delete_draft",
        entityType: config.entityType,
        entityKey: key,
        contentVersionId,
        before,
        session,
      });
    });
  } finally {
    await session.endSession();
  }
}

export async function duplicateContent(
  contentVersionId: string,
  resource: ContentResource,
  sourceKey: string,
  adminUserId: string,
  input: unknown,
) {
  const request = duplicateContentRequestSchema.parse(input);
  const config = getContentResourceConfig(resource);
  const source = (await config.model
    .findOne({ contentVersionId, key: sourceKey })
    .lean()
    .exec()) as ContentRecord | null;
  if (!source) {
    throw new ApiError(404, "CONTENT_NOT_FOUND", "Source content not found");
  }
  return createContent(contentVersionId, resource, adminUserId, {
    key: request.key,
    enabled: request.enabled,
    content: pickContent(source, config.contentFields),
  });
}

export async function getContentDependencies(
  contentVersionId: string,
  resource: ContentResource,
  key: string,
) {
  return findContentDependencies(contentVersionId, resource, key);
}

export async function getContentCatalog(contentVersionId: string) {
  const entries = await Promise.all(
    (Object.entries(contentResourceConfigs) as Array<
      [ContentResource, (typeof contentResourceConfigs)[ContentResource]]
    >).map(async ([resource, config]) => {
      const items = await config.model
        .find({ contentVersionId })
        .select("key name enabled")
        .sort({ key: 1 })
        .lean()
        .exec();
      return [resource, normalizeForJson(items)] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export async function bulkUpdateContent(
  contentVersionId: string,
  resource: ContentResource,
  adminUserId: string,
  input: unknown,
) {
  const request = bulkContentRequestSchema.parse(input);
  const enabled = request.action === "enable";
  const config = contentResourceConfigs[resource];
  const mongoose = await connectToDatabase();
  const session = await mongoose.startSession();
  let updated = 0;
  try {
    await session.withTransaction(async () => {
      await requireDraftVersion(contentVersionId, session);
      const documents = await config.model
        .find({ contentVersionId, key: { $in: request.keys } })
        .session(session)
        .exec();
      if (documents.length !== request.keys.length) {
        throw new ApiError(404, "CONTENT_NOT_FOUND", "One or more content keys were not found");
      }
      for (const document of documents) {
        if (document.get("enabled") === enabled) continue;
        const before = document.toObject();
        document.set("enabled", enabled);
        document.increment();
        await document.save({ session });
        await writeAdminAudit({
          adminUserId,
          action: "update",
          entityType: config.entityType,
          entityKey: String(document.get("key")),
          contentVersionId,
          before,
          after: document.toObject(),
          session,
        });
        updated += 1;
      }
    });
  } finally {
    await session.endSession();
  }
  return { matched: request.keys.length, updated, enabled };
}
