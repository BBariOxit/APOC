import "server-only";

import {
  type InferSchemaType,
  type Model,
  Schema,
  model,
  models,
} from "mongoose";

const statRulesSchema = new Schema(
  {
    min: { type: Number, required: true, default: 0, min: 0 },
    max: { type: Number, required: true, default: 100, min: 1 },
    criticalBelow: { type: Number, required: true, default: 35, min: 0 },
  },
  { _id: false },
);

const dailyRulesSchema = new Schema(
  {
    maxEventsPerDay: { type: Number, required: true, default: 3, min: 1 },
    foodUnitsPerCharacter: {
      type: Number,
      required: true,
      default: 1,
      min: 0,
    },
    waterUnitsPerCharacter: {
      type: Number,
      required: true,
      default: 1,
      min: 0,
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
    },
    healthPerLostSlot: {
      type: Number,
      required: true,
      default: 25,
      min: 1,
    },
    returnCooldownDays: {
      type: Number,
      required: true,
      default: 5,
      min: 0,
    },
    maxDurationDays: { type: Number, required: true, default: 14, min: 1 },
    maxJournalEntries: {
      type: Number,
      required: true,
      default: 32,
      min: 1,
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

gameRuleDefinitionSchema.pre("validate", function validateRuleRanges() {
  if (this.statRules.min >= this.statRules.max) {
    this.invalidate("statRules.max", "max must be greater than min");
  }

  if (
    this.statRules.criticalBelow <= this.statRules.min ||
    this.statRules.criticalBelow > this.statRules.max
  ) {
    this.invalidate(
      "statRules.criticalBelow",
      "criticalBelow must be greater than min and no greater than max",
    );
  }
});

export type GameRuleDefinition = InferSchemaType<
  typeof gameRuleDefinitionSchema
>;

export const GameRuleDefinitionModel =
  (models.GameRuleDefinition as Model<GameRuleDefinition> | undefined) ??
  model<GameRuleDefinition>("GameRuleDefinition", gameRuleDefinitionSchema);
