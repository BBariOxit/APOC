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
    version: {
      type: String,
      required: true,
      trim: true,
      match:
        /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/,
    },
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

contentVersionSchema.pre("validate", function validatePublishState() {
  if (this.status === "draft" && this.publishedAt) {
    this.invalidate("publishedAt", "draft content cannot have publishedAt");
  }
  if (this.status !== "draft" && !this.publishedAt) {
    this.invalidate(
      "publishedAt",
      "published and archived content require publishedAt",
    );
  }
});

export type ContentVersion = InferSchemaType<typeof contentVersionSchema>;

export const ContentVersionModel =
  (models.ContentVersion as Model<ContentVersion> | undefined) ??
  model<ContentVersion>("ContentVersion", contentVersionSchema);
