import "server-only";

import {
  type InferSchemaType,
  type Model,
  Schema,
  model,
  models,
} from "mongoose";

import { characterDefinitionContentSchema } from "@/server/validation/content";

const integerValidator = {
  validator: Number.isInteger,
  message: "{PATH} must be an integer",
};

const statField = {
  type: Number,
  required: true,
  min: 0,
  max: 100,
  validate: integerValidator,
};

const characterDefinitionSchema = new Schema(
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
    avatarUrl: { type: String, required: true, trim: true, maxlength: 2_000 },
    baseStats: {
      type: new Schema(
        {
          health: statField,
          satiety: statField,
          hydration: statField,
          sanity: statField,
        },
        { _id: false },
      ),
      required: true,
    },
    baseLoadoutSlots: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
      validate: integerValidator,
    },
    traits: { type: [String], required: true, default: [] },
  },
  { collection: "character_definitions", timestamps: true },
);

characterDefinitionSchema.index(
  { contentVersionId: 1, key: 1 },
  { unique: true },
);
characterDefinitionSchema.index({ contentVersionId: 1, enabled: 1 });

characterDefinitionSchema.pre("validate", function validateContent() {
  const definition = this.toObject();
  const result = characterDefinitionContentSchema.safeParse({
    name: definition.name,
    description: definition.description,
    avatarUrl: definition.avatarUrl,
    baseStats: definition.baseStats,
    baseLoadoutSlots: definition.baseLoadoutSlots,
    traits: definition.traits,
  });
  if (!result.success) {
    result.error.issues.forEach((issue) =>
      this.invalidate(issue.path.join("."), issue.message),
    );
  }
});

export type CharacterDefinition = InferSchemaType<
  typeof characterDefinitionSchema
>;

export const CharacterDefinitionModel =
  (models.CharacterDefinition as Model<CharacterDefinition> | undefined) ??
  model<CharacterDefinition>("CharacterDefinition", characterDefinitionSchema);
