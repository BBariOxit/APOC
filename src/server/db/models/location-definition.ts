import "server-only";

import {
  type InferSchemaType,
  type Model,
  Schema,
  model,
  models,
} from "mongoose";

import { locationDefinitionContentSchema } from "@/server/validation/content";

const integerValidator = {
  validator: Number.isInteger,
  message: "{PATH} must be an integer",
};

const locationDefinitionSchema = new Schema(
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
    mapPosition: {
      type: new Schema(
        {
          x: { type: Number, required: true },
          y: { type: Number, required: true },
        },
        { _id: false },
      ),
    },
    hidden: { type: Boolean, required: true, default: false },
    dangerLevel: {
      type: String,
      enum: ["low", "medium", "high", "extreme"],
      required: true,
    },
    travelDays: {
      type: new Schema(
        {
          min: { type: Number, required: true, min: 1, validate: integerValidator },
          max: { type: Number, required: true, min: 1, validate: integerValidator },
        },
        { _id: false },
      ),
      required: true,
    },
    tags: { type: [String], required: true, default: [] },
    discoveryRequirements: { type: Schema.Types.Mixed },
    eventPool: {
      type: [
        new Schema(
          {
            eventKey: { type: String, required: true, trim: true },
            weight: {
              type: Number,
              required: true,
              min: 1,
              validate: integerValidator,
            },
            requirements: { type: Schema.Types.Mixed },
            maxOccurrencesPerExpedition: {
              type: Number,
              min: 1,
              validate: integerValidator,
            },
          },
          { _id: false },
        ),
      ],
      required: true,
    },
  },
  { collection: "location_definitions", timestamps: true },
);

locationDefinitionSchema.index(
  { contentVersionId: 1, key: 1 },
  { unique: true },
);
locationDefinitionSchema.index({ contentVersionId: 1, enabled: 1, hidden: 1 });
locationDefinitionSchema.index({ contentVersionId: 1, tags: 1 });

locationDefinitionSchema.pre("validate", function validateContent() {
  const definition = this.toObject();
  const result = locationDefinitionContentSchema.safeParse({
    name: definition.name,
    description: definition.description,
    iconUrl: definition.iconUrl,
    mapPosition: definition.mapPosition,
    hidden: definition.hidden,
    dangerLevel: definition.dangerLevel,
    travelDays: definition.travelDays,
    tags: definition.tags,
    discoveryRequirements: definition.discoveryRequirements,
    eventPool: definition.eventPool,
  });
  if (!result.success) {
    result.error.issues.forEach((issue) =>
      this.invalidate(issue.path.join("."), issue.message),
    );
  }
});

export type LocationDefinition = InferSchemaType<typeof locationDefinitionSchema>;

export const LocationDefinitionModel =
  (models.LocationDefinition as Model<LocationDefinition> | undefined) ??
  model<LocationDefinition>("LocationDefinition", locationDefinitionSchema);
