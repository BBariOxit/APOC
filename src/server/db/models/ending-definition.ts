import "server-only";

import {
  type InferSchemaType,
  type Model,
  Schema,
  model,
  models,
} from "mongoose";

import { endingDefinitionContentSchema } from "@/server/validation/content";

const integerValidator = {
  validator: Number.isInteger,
  message: "{PATH} must be an integer",
};

const endingDefinitionSchema = new Schema(
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
    imageUrl: { type: String, trim: true, maxlength: 2_000 },
    type: {
      type: String,
      enum: ["good", "bad", "neutral", "secret", "joke"],
      required: true,
    },
    priority: {
      type: Number,
      required: true,
      min: 0,
      validate: integerValidator,
    },
    hidden: { type: Boolean, required: true, default: false },
    requirements: { type: Schema.Types.Mixed },
  },
  { collection: "ending_definitions", timestamps: true },
);

endingDefinitionSchema.index(
  { contentVersionId: 1, key: 1 },
  { unique: true },
);
endingDefinitionSchema.index({ contentVersionId: 1, enabled: 1, priority: -1 });

endingDefinitionSchema.pre("validate", function validateContent() {
  const definition = this.toObject();
  const result = endingDefinitionContentSchema.safeParse({
    name: definition.name,
    description: definition.description,
    imageUrl: definition.imageUrl,
    type: definition.type,
    priority: definition.priority,
    hidden: definition.hidden,
    requirements: definition.requirements,
  });
  if (!result.success) {
    result.error.issues.forEach((issue) =>
      this.invalidate(issue.path.join("."), issue.message),
    );
  }
});

export type EndingDefinition = InferSchemaType<typeof endingDefinitionSchema>;

export const EndingDefinitionModel =
  (models.EndingDefinition as Model<EndingDefinition> | undefined) ??
  model<EndingDefinition>("EndingDefinition", endingDefinitionSchema);
