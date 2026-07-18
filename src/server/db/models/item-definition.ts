import "server-only";

import {
  type InferSchemaType,
  type Model,
  Schema,
  model,
  models,
} from "mongoose";

import { itemDefinitionContentSchema } from "@/server/validation/content";

const integerValidator = {
  validator: Number.isInteger,
  message: "{PATH} must be an integer",
};

const itemDefinitionSchema = new Schema(
  {
    contentVersionId: {
      type: Schema.Types.ObjectId,
      ref: "ContentVersion",
      required: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:_[a-z0-9]+)*$/,
    },
    enabled: { type: Boolean, required: true, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 2_000 },
    iconUrl: { type: String, required: true, trim: true, maxlength: 2_000 },
    category: {
      type: String,
      enum: ["food", "water", "tool", "medical", "weapon", "quest"],
      required: true,
    },
    stackable: { type: Boolean, required: true },
    maxStack: { type: Number, min: 1, max: 999, validate: integerValidator },
    canBreak: { type: Boolean, required: true, default: false },
    hidden: { type: Boolean, required: true, default: false },
    tags: { type: [String], required: true, default: [] },
    accountUnlockRule: { type: Schema.Types.Mixed },
  },
  { collection: "item_definitions", timestamps: true },
);

itemDefinitionSchema.index(
  { contentVersionId: 1, key: 1 },
  { unique: true },
);
itemDefinitionSchema.index({ contentVersionId: 1, enabled: 1, hidden: 1 });
itemDefinitionSchema.index({ contentVersionId: 1, category: 1 });
itemDefinitionSchema.index({ contentVersionId: 1, tags: 1 });

itemDefinitionSchema.pre("validate", function validateContent() {
  const definition = this.toObject();
  const result = itemDefinitionContentSchema.safeParse({
    name: definition.name,
    description: definition.description,
    iconUrl: definition.iconUrl,
    category: definition.category,
    stackable: definition.stackable,
    maxStack: definition.maxStack,
    canBreak: definition.canBreak,
    hidden: definition.hidden,
    tags: definition.tags,
    accountUnlockRule: definition.accountUnlockRule,
  });
  if (!result.success) {
    result.error.issues.forEach((issue) =>
      this.invalidate(issue.path.join("."), issue.message),
    );
  }
});

export type ItemDefinition = InferSchemaType<typeof itemDefinitionSchema>;

export const ItemDefinitionModel =
  (models.ItemDefinition as Model<ItemDefinition> | undefined) ??
  model<ItemDefinition>("ItemDefinition", itemDefinitionSchema);
