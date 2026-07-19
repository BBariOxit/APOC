import "server-only";

import type { ClientSession } from "mongoose";

import { AdminAuditLogModel } from "@/server/db/models";

export type AdminAuditAction =
  | "create"
  | "update"
  | "delete_draft"
  | "publish"
  | "archive";

interface WriteAuditInput {
  adminUserId: string;
  action: AdminAuditAction;
  entityType: string;
  entityKey: string;
  contentVersionId?: string;
  before?: unknown;
  after?: unknown;
  session?: ClientSession;
}

export async function writeAdminAudit(input: WriteAuditInput): Promise<void> {
  const { session, ...document } = input;
  await AdminAuditLogModel.create([document], { session });
}
