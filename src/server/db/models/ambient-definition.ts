import "server-only";

import {
  type InferSchemaType,
  type Model,
  Schema,
  model,
  models,
} from "mongoose";

import { ambientDefinitionContentSchema } from "@/server/validation/content";

const integerValidator = {
  validator: Number.isInteger,
  message: "{PATH} must be an integer",
};

const ambientTriggerSchema = new Schema(
  {
    mode: {
      type: String,
      enum: ["random", "fixed_day", "scheduled"],
      required: true,
    },
    fixedDay: { type: Number, min: 1, validate: integerValidator },
    minDay: { type: Number, min: 1, validate: integerValidator },
    maxDay: { type: Number, min: 1, validate: integerValidator },
    maxOccurrences: { type: Number, min: 1, validate: integerValidator },
    cooldownDays: { type: Number, min: 0, validate: integerValidator },
  },
  { _id: false },
);

const ambientDefinitionSchema = new Schema(
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
    timeLabel: { type: String, required: true, trim: true, maxlength: 80 },
    rarity: {
      type: String,
      enum: ["common", "uncommon", "rare", "ultra_rare"],
      required: true,
    },
    weight: {
      type: Number,
      required: true,
      min: 1,
      validate: integerValidator,
    },
    hidden: { type: Boolean, required: true, default: false },
    tags: { type: [String], required: true, default: [] },
    trigger: { type: ambientTriggerSchema, required: true },
    requirements: { type: Schema.Types.Mixed },
    exclusionAmbientKeys: { type: [String], required: true, default: [] },
    mutexGroup: { type: String, trim: true },
    resolution: { type: Schema.Types.Mixed, required: true },
  },
  {
    collection: "ambient_definitions",
    timestamps: true,
  },
);

ambientDefinitionSchema.index(
  { contentVersionId: 1, key: 1 },
  { unique: true },
);
ambientDefinitionSchema.index({
  contentVersionId: 1,
  enabled: 1,
  "trigger.mode": 1,
});
ambientDefinitionSchema.index({ contentVersionId: 1, tags: 1 });

ambientDefinitionSchema.pre("validate", function validateDefinitionContent() {
  const definition = this.toObject();
  const result = ambientDefinitionContentSchema.safeParse({
    name: definition.name,
    timeLabel: definition.timeLabel,
    rarity: definition.rarity,
    weight: definition.weight,
    hidden: definition.hidden,
    tags: definition.tags,
    trigger: definition.trigger,
    requirements: definition.requirements,
    exclusionAmbientKeys: definition.exclusionAmbientKeys,
    mutexGroup: definition.mutexGroup,
    resolution: definition.resolution,
  });

  if (!result.success) {
    for (const issue of result.error.issues) {
      this.invalidate(issue.path.join("."), issue.message);
    }
  }
});

export type AmbientDefinition = InferSchemaType<
  typeof ambientDefinitionSchema
>;

export const AmbientDefinitionModel =
  (models.AmbientDefinition as Model<AmbientDefinition> | undefined) ??
  model<AmbientDefinition>("AmbientDefinition", ambientDefinitionSchema);
