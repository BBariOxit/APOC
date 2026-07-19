import "server-only";

import {
  type InferSchemaType,
  type Model,
  Schema,
  model,
  models,
} from "mongoose";

import { gameRuleDefinitionContentSchema } from "@/server/validation/content";

const integerValidator = {
  validator: Number.isInteger,
  message: "{PATH} must be an integer",
};

const runSetupSchema = new Schema(
  {
    characterKeys: { type: [String], required: true, default: [] },
    inventory: {
      type: [
        new Schema(
          {
            itemKey: { type: String, required: true, trim: true },
            intactQuantity: {
              type: Number,
              required: true,
              min: 0,
              validate: integerValidator,
            },
            brokenQuantity: {
              type: Number,
              required: true,
              min: 0,
              validate: integerValidator,
            },
          },
          { _id: false },
        ),
      ],
      required: true,
      default: [],
    },
  },
  { _id: false },
);

const statRulesSchema = new Schema(
  {
    criticalBelow: {
      type: Number,
      required: true,
      default: 35,
      min: 1,
      max: 100,
      validate: integerValidator,
    },
  },
  { _id: false },
);

const dailyRulesSchema = new Schema(
  {
    maxEventsPerDay: {
      type: Number,
      required: true,
      default: 3,
      min: 1,
      max: 3,
      validate: integerValidator,
    },
    maxAmbientPerDay: {
      type: Number,
      required: true,
      default: 1,
      min: 0,
      max: 1,
      validate: integerValidator,
    },
    ambientChance: {
      type: Number,
      required: true,
      default: 0.65,
      min: 0,
      max: 1,
    },
    foodUnitsPerCharacter: {
      type: Number,
      required: true,
      default: 1,
      min: 0,
      validate: integerValidator,
    },
    waterUnitsPerCharacter: {
      type: Number,
      required: true,
      default: 1,
      min: 0,
      validate: integerValidator,
    },
    hungerStatLoss: {
      type: Number,
      required: true,
      default: 20,
      min: 0,
      max: 100,
      validate: integerValidator,
    },
    thirstStatLoss: {
      type: Number,
      required: true,
      default: 25,
      min: 0,
      max: 100,
      validate: integerValidator,
    },
  },
  { _id: false },
);

const expeditionRulesSchema = new Schema(
  {
    visibleLoadoutSlots: {
      type: Number,
      required: true,
      default: 4,
      min: 1,
      max: 8,
      validate: integerValidator,
    },
    healthPerLostSlot: {
      type: Number,
      required: true,
      default: 25,
      min: 1,
      max: 100,
      validate: integerValidator,
    },
    returnCooldownDays: {
      type: Number,
      required: true,
      default: 5,
      min: 0,
      max: 30,
      validate: integerValidator,
    },
    maxDurationDays: {
      type: Number,
      required: true,
      default: 14,
      min: 1,
      max: 30,
      validate: integerValidator,
    },
    maxJournalEntries: {
      type: Number,
      required: true,
      default: 32,
      min: 1,
      max: 100,
      validate: integerValidator,
    },
  },
  { _id: false },
);

const gameRuleDefinitionSchema = new Schema(
  {
    contentVersionId: {
      type: Schema.Types.ObjectId,
      ref: "ContentVersion",
      required: true,
    },
    runSetup: { type: runSetupSchema, required: true, default: () => ({}) },
    statRules: { type: statRulesSchema, required: true },
    dailyRules: { type: dailyRulesSchema, required: true },
    expeditionRules: { type: expeditionRulesSchema, required: true },
  },
  {
    collection: "game_rule_definitions",
    timestamps: true,
  },
);

gameRuleDefinitionSchema.index({ contentVersionId: 1 }, { unique: true });

gameRuleDefinitionSchema.pre("validate", function validateContent() {
  const definition = this.toObject();
  const result = gameRuleDefinitionContentSchema.safeParse({
    runSetup: definition.runSetup,
    statRules: definition.statRules,
    dailyRules: definition.dailyRules,
    expeditionRules: definition.expeditionRules,
  });
  if (!result.success) {
    result.error.issues.forEach((issue) =>
      this.invalidate(issue.path.join("."), issue.message),
    );
  }
});

export type GameRuleDefinition = InferSchemaType<
  typeof gameRuleDefinitionSchema
>;

export const GameRuleDefinitionModel =
  (models.GameRuleDefinition as Model<GameRuleDefinition> | undefined) ??
  model<GameRuleDefinition>("GameRuleDefinition", gameRuleDefinitionSchema);
