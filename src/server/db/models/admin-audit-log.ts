import "server-only";

import {
  type InferSchemaType,
  type Model,
  Schema,
  model,
  models,
} from "mongoose";

const adminAuditLogSchema = new Schema(
  {
    adminUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: ["create", "update", "delete_draft", "publish", "archive"],
      required: true,
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 80,
    },
    entityKey: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 160,
    },
    contentVersionId: {
      type: Schema.Types.ObjectId,
      ref: "ContentVersion",
    },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
  },
  {
    collection: "admin_audit_logs",
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

adminAuditLogSchema.index({ adminUserId: 1, createdAt: -1 });
adminAuditLogSchema.index({ entityType: 1, entityKey: 1, createdAt: -1 });
adminAuditLogSchema.index({ contentVersionId: 1, createdAt: -1 });

adminAuditLogSchema.pre("save", function rejectDocumentUpdates() {
  if (!this.isNew) {
    throw new Error("admin audit logs are append-only");
  }
});

function rejectQueryMutation(): never {
  throw new Error("admin audit logs are append-only");
}

adminAuditLogSchema.pre("updateOne", rejectQueryMutation);
adminAuditLogSchema.pre("updateMany", rejectQueryMutation);
adminAuditLogSchema.pre("findOneAndUpdate", rejectQueryMutation);
adminAuditLogSchema.pre("replaceOne", rejectQueryMutation);
adminAuditLogSchema.pre("deleteOne", rejectQueryMutation);
adminAuditLogSchema.pre(
  "deleteOne",
  { document: true, query: false },
  rejectQueryMutation,
);
adminAuditLogSchema.pre("deleteMany", rejectQueryMutation);
adminAuditLogSchema.pre("findOneAndDelete", rejectQueryMutation);

export type AdminAuditLog = InferSchemaType<typeof adminAuditLogSchema>;

export const AdminAuditLogModel =
  (models.AdminAuditLog as Model<AdminAuditLog> | undefined) ??
  model<AdminAuditLog>("AdminAuditLog", adminAuditLogSchema);
