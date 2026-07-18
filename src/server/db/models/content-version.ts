import "server-only";

import {
  type InferSchemaType,
  type Model,
  Schema,
  model,
  models,
} from "mongoose";

const contentVersionSchema = new Schema(
  {
    version: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      required: true,
      default: "draft",
    },
    changelog: { type: String, required: true, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    publishedAt: { type: Date },
  },
  {
    collection: "content_versions",
    timestamps: true,
  },
);

contentVersionSchema.index({ version: 1 }, { unique: true });
contentVersionSchema.index(
  { status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "published" },
  },
);

export type ContentVersion = InferSchemaType<typeof contentVersionSchema>;

export const ContentVersionModel =
  (models.ContentVersion as Model<ContentVersion> | undefined) ??
  model<ContentVersion>("ContentVersion", contentVersionSchema);
