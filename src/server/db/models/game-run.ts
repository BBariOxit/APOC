import "server-only";

import {
  type InferSchemaType,
  type Model,
  Schema,
  model,
  models,
} from "mongoose";

const characterStatsSchema = new Schema(
  {
    health: { type: Number, required: true, min: 0, max: 100 },
    satiety: { type: Number, required: true, min: 0, max: 100 },
    hydration: { type: Number, required: true, min: 0, max: 100 },
    sanity: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false },
);

const characterConditionSchema = new Schema(
  {
    type: { type: String, required: true, trim: true },
    severity: { type: Number, min: 1 },
    remainingDays: { type: Number, min: 0 },
    sourceEventKey: { type: String, trim: true },
  },
  { _id: false },
);

const runCharacterSchema = new Schema(
  {
    characterKey: { type: String, required: true, trim: true },
    stats: { type: characterStatsSchema, required: true },
    state: {
      type: String,
      enum: ["shelter", "expedition", "missing", "dead", "insane"],
      required: true,
      default: "shelter",
    },
    nextExpeditionDay: { type: Number, min: 1 },
    conditions: {
      type: [characterConditionSchema],
      required: true,
      default: [],
    },
    expedition: {
      type: new Schema(
        {
          expeditionId: { type: String, required: true },
          expectedReturnDay: { type: Number, min: 1 },
        },
        { _id: false },
      ),
    },
    death: {
      type: new Schema(
        {
          day: { type: Number, required: true, min: 1 },
          cause: { type: String, required: true },
          expeditionId: { type: String },
          locationKey: { type: String },
          eventKey: { type: String },
          itemBranchKey: { type: String },
          resultKey: { type: String },
        },
        { _id: false },
      ),
    },
  },
  { _id: false },
);

const inventoryEntrySchema = new Schema(
  {
    itemKey: { type: String, required: true, trim: true },
    intactQuantity: { type: Number, required: true, default: 0, min: 0 },
    brokenQuantity: { type: Number, required: true, default: 0, min: 0 },
    discovered: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

const pendingEventSchema = new Schema(
  {
    instanceId: { type: String, required: true },
    eventKey: { type: String, required: true },
    generatedDay: { type: Number, required: true, min: 1 },
    sequence: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const queuedEventSchema = new Schema(
  {
    eventKey: { type: String, required: true },
    scheduledDay: { type: Number, required: true, min: 1 },
    sourceEventKey: { type: String },
  },
  { _id: false },
);

const gameRunSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    contentVersionId: {
      type: Schema.Types.ObjectId,
      ref: "ContentVersion",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "abandoned"],
      required: true,
      default: "active",
    },
    mode: {
      type: String,
      enum: ["normal", "daily_challenge"],
      required: true,
      default: "normal",
    },
    day: { type: Number, required: true, default: 1, min: 1 },
    revision: { type: Number, required: true, default: 0, min: 0 },
    random: {
      type: new Schema(
        {
          seed: { type: String, required: true },
          cursor: { type: Number, required: true, default: 0, min: 0 },
        },
        { _id: false },
      ),
      required: true,
    },
    characters: { type: [runCharacterSchema], required: true },
    inventory: {
      type: [inventoryEntrySchema],
      required: true,
      default: [],
    },
    locations: {
      type: [
        new Schema(
          {
            locationKey: { type: String, required: true },
            status: {
              type: String,
              enum: ["rumored", "discovered", "visited", "depleted"],
              required: true,
            },
            discoveredDay: { type: Number, required: true, min: 1 },
            discoveredByCharacterKey: { type: String },
            sourceExpeditionId: { type: String },
            visitedCount: { type: Number, required: true, default: 0, min: 0 },
            lastVisitedDay: { type: Number, min: 1 },
            depletedUntilDay: { type: Number, min: 1 },
          },
          { _id: false },
        ),
      ],
      required: true,
      default: [],
    },
    expeditionState: {
      type: new Schema(
        {
          activeExpeditionIds: { type: [String], required: true, default: [] },
          unreadReturnReportIds: {
            type: [String],
            required: true,
            default: [],
          },
        },
        { _id: false },
      ),
      required: true,
    },
    flags: {
      type: Map,
      of: Schema.Types.Mixed,
      required: true,
      default: () => new Map(),
    },
    counters: {
      type: Map,
      of: Number,
      required: true,
      default: () => new Map(),
    },
    unlockedEventKeys: { type: [String], required: true, default: [] },
    discoveredItemKeys: { type: [String], required: true, default: [] },
    eventState: {
      type: new Schema(
        {
          occurredCounts: {
            type: Map,
            of: Number,
            required: true,
            default: () => new Map(),
          },
          lastOccurredDay: {
            type: Map,
            of: Number,
            required: true,
            default: () => new Map(),
          },
          completedEventKeys: { type: [String], required: true, default: [] },
          blockedEventKeys: { type: [String], required: true, default: [] },
          queuedEvents: { type: [queuedEventSchema], required: true, default: [] },
          pendingEvents: {
            type: [pendingEventSchema],
            required: true,
            default: [],
          },
        },
        { _id: false },
      ),
      required: true,
    },
    ending: {
      type: new Schema(
        {
          endingKey: { type: String, required: true },
          triggeredAtDay: { type: Number, required: true, min: 1 },
        },
        { _id: false },
      ),
    },
    startedAt: { type: Date, required: true, default: Date.now },
    lastPlayedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date },
  },
  {
    collection: "game_runs",
    optimisticConcurrency: true,
    timestamps: true,
  },
);

gameRunSchema.index(
  { userId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "active" },
  },
);
gameRunSchema.index({ contentVersionId: 1, status: 1 });
gameRunSchema.index({ userId: 1, lastPlayedAt: -1 });
gameRunSchema.index({ status: 1, lastPlayedAt: 1 });

gameRunSchema.pre("validate", function validateRunCollections() {
  const characterKeys = this.characters.map(
    (character) => character.characterKey,
  );
  const itemKeys = this.inventory.map((item) => item.itemKey);
  const eventInstanceIds = this.eventState.pendingEvents.map(
    (event) => event.instanceId,
  );

  if (new Set(characterKeys).size !== characterKeys.length) {
    this.invalidate("characters", "characterKey must be unique within a run");
  }

  if (new Set(itemKeys).size !== itemKeys.length) {
    this.invalidate("inventory", "itemKey must be unique within a run");
  }

  if (new Set(eventInstanceIds).size !== eventInstanceIds.length) {
    this.invalidate(
      "eventState.pendingEvents",
      "instanceId must be unique within a run",
    );
  }
});

export type GameRun = InferSchemaType<typeof gameRunSchema>;

export const GameRunModel =
  (models.GameRun as Model<GameRun> | undefined) ??
  model<GameRun>("GameRun", gameRunSchema);
