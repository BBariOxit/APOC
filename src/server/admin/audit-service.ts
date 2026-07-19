import "server-only";

import { Types } from "mongoose";

import { AdminAuditLogModel } from "@/server/db/models";
import { ApiError } from "@/server/http/api-error";

interface AuditListOptions {
  cursor?: string;
  limit?: number;
  contentVersionId?: string;
  entityType?: string;
  entityKey?: string;
  adminUserId?: string;
}

export async function listAdminAuditLogs(options: AuditListOptions) {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const query: Record<string, unknown> = {};
  if (options.cursor) {
    if (!Types.ObjectId.isValid(options.cursor)) {
      throw new ApiError(400, "VALIDATION_ERROR", "cursor is invalid");
    }
    query._id = { $lt: new Types.ObjectId(options.cursor) };
  }
  for (const field of ["contentVersionId", "adminUserId"] as const) {
    const value = options[field];
    if (value) {
      if (!Types.ObjectId.isValid(value)) {
        throw new ApiError(400, "VALIDATION_ERROR", `${field} is invalid`);
      }
      query[field] = value;
    }
  }
  if (options.entityType) query.entityType = options.entityType.slice(0, 80);
  if (options.entityKey) query.entityKey = options.entityKey.slice(0, 160);

  const documents = await AdminAuditLogModel.find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean()
    .exec();
  const hasNextPage = documents.length > limit;
  const page = documents.slice(0, limit);
  return {
    items: page.map((document) => ({
      id: document._id.toString(),
      adminUserId: document.adminUserId.toString(),
      action: document.action,
      entityType: document.entityType,
      entityKey: document.entityKey,
      contentVersionId: document.contentVersionId?.toString() ?? null,
      before: document.before,
      after: document.after,
      createdAt: document.createdAt.toISOString(),
    })),
    pageInfo: {
      hasNextPage,
      nextCursor: hasNextPage
        ? page[page.length - 1]?._id.toString() ?? null
        : null,
    },
  };
}
