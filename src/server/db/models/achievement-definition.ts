import "server-only";

import {
  type InferSchemaType,
  type Model,
  Schema,
  model,
  models,
} from "mongoose";

import { achievementDefinitionContentSchema } from "@/server/validation/content";

const integerValidator = {
  validator: Number.isInteger,
  message: "{PATH} must be an integer",
};

const achievementDefinitionSchema = new Schema(
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
    iconUrl: { type: String, trim: true, maxlength: 2_000 },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },
    hidden: { type: Boolean, required: true, default: false },
    progressType: {
      type: String,
      enum: ["binary", "counter", "best_value"],
      required: true,
    },
    target: {
      type: Number,
      required: true,
      min: 1,
      validate: integerValidator,
    },
    requirements: { type: Schema.Types.Mixed, required: true },
    rewards: { type: [Schema.Types.Mixed], required: true, default: [] },
  },
  { collection: "achievement_definitions", timestamps: true },
);

achievementDefinitionSchema.index(
  { contentVersionId: 1, key: 1 },
  { unique: true },
);
achievementDefinitionSchema.index({
  contentVersionId: 1,
  enabled: 1,
  hidden: 1,
});
achievementDefinitionSchema.index({ contentVersionId: 1, difficulty: 1 });

achievementDefinitionSchema.pre("validate", function validateContent() {
  const definition = this.toObject();
  const result = achievementDefinitionContentSchema.safeParse({
    name: definition.name,
    description: definition.description,
    iconUrl: definition.iconUrl,
    difficulty: definition.difficulty,
    hidden: definition.hidden,
    progressType: definition.progressType,
    target: definition.target,
    requirements: definition.requirements,
    rewards: definition.rewards,
  });
  if (!result.success) {
    result.error.issues.forEach((issue) =>
      this.invalidate(issue.path.join("."), issue.message),
    );
  }
});

export type AchievementDefinition = InferSchemaType<
  typeof achievementDefinitionSchema
>;

export const AchievementDefinitionModel =
  (models.AchievementDefinition as Model<AchievementDefinition> | undefined) ??
  model<AchievementDefinition>(
    "AchievementDefinition",
    achievementDefinitionSchema,
  );
