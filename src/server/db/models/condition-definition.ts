import "server-only";

import { type InferSchemaType, type Model, Schema, model, models } from "mongoose";

import { conditionDefinitionContentSchema } from "@/server/validation/content";

const conditionDefinitionSchema = new Schema(
  {
    contentVersionId: { type: Schema.Types.ObjectId, ref: "ContentVersion", required: true },
    key: { type: String, required: true, trim: true, lowercase: true, match: /^[a-z0-9]+(?:_[a-z0-9]+)*$/ },
    enabled: { type: Boolean, required: true, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 2_000 },
    tone: { type: String, enum: ["neutral", "warning", "danger"], required: true },
    derivation: { type: Schema.Types.Mixed, required: true },
  },
  { collection: "condition_definitions", timestamps: true },
);

conditionDefinitionSchema.index({ contentVersionId: 1, key: 1 }, { unique: true });
conditionDefinitionSchema.index({ contentVersionId: 1, enabled: 1 });

conditionDefinitionSchema.pre("validate", function validateContent() {
  const definition = this.toObject();
  const result = conditionDefinitionContentSchema.safeParse({
    name: definition.name,
    description: definition.description,
    tone: definition.tone,
    derivation: definition.derivation,
  });
  if (!result.success) {
    result.error.issues.forEach((issue) => this.invalidate(issue.path.join("."), issue.message));
  }
});

export type ConditionDefinition = InferSchemaType<typeof conditionDefinitionSchema>;

export const ConditionDefinitionModel =
  (models.ConditionDefinition as Model<ConditionDefinition> | undefined) ??
  model<ConditionDefinition>("ConditionDefinition", conditionDefinitionSchema);
