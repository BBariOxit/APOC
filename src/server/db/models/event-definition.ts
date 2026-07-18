import "server-only";

import {
  type InferSchemaType,
  type Model,
  Schema,
  model,
  models,
} from "mongoose";

import { eventDefinitionContentSchema } from "@/server/validation/content";

const integerValidator = {
  validator: Number.isInteger,
  message: "{PATH} must be an integer",
};

const eventTriggerSchema = new Schema(
  {
    mode: {
      type: String,
      enum: [
        "random",
        "fixed_day",
        "scheduled",
        "chained",
        "location_pool",
        "manual",
      ],
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

const eventDefinitionSchema = new Schema(
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
    imageUrl: { type: String, trim: true },
    category: {
      type: String,
      enum: ["story", "daily", "location", "special"],
      required: true,
    },
    delivery: {
      type: String,
      enum: ["pending", "expedition"],
      required: true,
    },
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
    trigger: { type: eventTriggerSchema, required: true },
    requirements: { type: Schema.Types.Mixed },
    exclusionEventKeys: { type: [String], required: true, default: [] },
    mutexGroup: { type: String, trim: true },
    interaction: { type: Schema.Types.Mixed, required: true },
  },
  {
    collection: "event_definitions",
    timestamps: true,
  },
);

eventDefinitionSchema.index(
  { contentVersionId: 1, key: 1 },
  { unique: true },
);
eventDefinitionSchema.index({
  contentVersionId: 1,
  enabled: 1,
  delivery: 1,
  "trigger.mode": 1,
});
eventDefinitionSchema.index({ contentVersionId: 1, tags: 1 });

eventDefinitionSchema.pre("validate", function validateDefinitionContent() {
  const definition = this.toObject();
  const result = eventDefinitionContentSchema.safeParse({
    name: definition.name,
    description: definition.description,
    imageUrl: definition.imageUrl,
    category: definition.category,
    delivery: definition.delivery,
    rarity: definition.rarity,
    weight: definition.weight,
    hidden: definition.hidden,
    tags: definition.tags,
    trigger: definition.trigger,
    requirements: definition.requirements,
    exclusionEventKeys: definition.exclusionEventKeys,
    mutexGroup: definition.mutexGroup,
    interaction: definition.interaction,
  });

  if (!result.success) {
    for (const issue of result.error.issues) {
      this.invalidate(issue.path.join("."), issue.message);
    }
  }
});

export type EventDefinition = InferSchemaType<typeof eventDefinitionSchema>;

export const EventDefinitionModel =
  (models.EventDefinition as Model<EventDefinition> | undefined) ??
  model<EventDefinition>("EventDefinition", eventDefinitionSchema);
