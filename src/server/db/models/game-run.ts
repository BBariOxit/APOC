import "server-only";

import {
  type InferSchemaType,
  type Model,
  Schema,
  model,
  models,
} from "mongoose";

const integerValidator = {
  validator: Number.isInteger,
  message: "{PATH} must be an integer",
};

const uniqueStringArrayValidator = {
  validator: (values: string[]) => new Set(values).size === values.length,
  message: "{PATH} must not contain duplicate values",
};

function hasOnlyNonNegativeIntegerValues(
  values: Map<string, number> | undefined,
): boolean {
  return (
    values !== undefined &&
    Array.from(values.values()).every(
      (value) => Number.isInteger(value) && value >= 0,
    )
  );
}

const characterStatsSchema = new Schema(
  {
    health: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      validate: integerValidator,
    },
    satiety: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      validate: integerValidator,
    },
    hydration: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      validate: integerValidator,
    },
    sanity: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      validate: integerValidator,
    },
  },
  { _id: false },
);

const characterConditionSchema = new Schema(
  {
    type: { type: String, required: true, trim: true },
    severity: { type: Number, min: 1, validate: integerValidator },
    remainingDays: { type: Number, min: 0, validate: integerValidator },
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
    nextExpeditionDay: { type: Number, min: 1, validate: integerValidator },
    conditions: {
      type: [characterConditionSchema],
      required: true,
      default: [],
    },
    expedition: {
      type: new Schema(
        {
          expeditionId: { type: String, required: true },
          expectedReturnDay: {
            type: Number,
            min: 1,
            validate: integerValidator,
          },
        },
        { _id: false },
      ),
    },
    death: {
      type: new Schema(
        {
          day: {
            type: Number,
            required: true,
            min: 1,
            validate: integerValidator,
          },
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
    intactQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: integerValidator,
    },
    brokenQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: integerValidator,
    },
  },
  { _id: false },
);

const pendingEventSchema = new Schema(
  {
    instanceId: { type: String, required: true },
    eventKey: { type: String, required: true },
    generatedDay: {
      type: Number,
      required: true,
      min: 1,
      validate: integerValidator,
    },
    sequence: {
      type: Number,
      required: true,
      min: 0,
      validate: integerValidator,
    },
  },
  { _id: false },
);

const queuedEventSchema = new Schema(
  {
    eventKey: { type: String, required: true },
    scheduledDay: {
      type: Number,
      required: true,
      min: 1,
      validate: integerValidator,
    },
    sourceEventKey: { type: String },
  },
  { _id: false },
);

const queuedAmbientSchema = new Schema(
  {
    ambientKey: { type: String, required: true },
    scheduledDay: {
      type: Number,
      required: true,
      min: 1,
      validate: integerValidator,
    },
    sourceAmbientKey: { type: String },
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
    engineVersion: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 80,
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
    day: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
      validate: integerValidator,
    },
    revision: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: integerValidator,
    },
    random: {
      type: new Schema(
        {
          seed: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 256,
          },
          cursor: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
            validate: integerValidator,
          },
        },
        { _id: false },
      ),
      required: true,
      default: () => ({}),
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
            discoveredDay: {
              type: Number,
              required: true,
              min: 1,
              validate: integerValidator,
            },
            discoveredByCharacterKey: { type: String },
            sourceExpeditionId: { type: String },
            visitedCount: {
              type: Number,
              required: true,
              default: 0,
              min: 0,
              validate: integerValidator,
            },
            lastVisitedDay: {
              type: Number,
              min: 1,
              validate: integerValidator,
            },
            depletedUntilDay: {
              type: Number,
              min: 1,
              validate: integerValidator,
            },
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
          activeExpeditionIds: {
            type: [String],
            required: true,
            default: [],
            validate: uniqueStringArrayValidator,
          },
          unreadReturnReportIds: {
            type: [String],
            required: true,
            default: [],
            validate: uniqueStringArrayValidator,
          },
        },
        { _id: false },
      ),
      required: true,
      default: () => ({}),
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
    unlockedEventKeys: {
      type: [String],
      required: true,
      default: [],
      validate: uniqueStringArrayValidator,
    },
    discoveredItemKeys: {
      type: [String],
      required: true,
      default: [],
      validate: uniqueStringArrayValidator,
    },
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
          choiceCounts: {
            type: Map,
            of: Number,
            required: true,
            default: () => new Map(),
          },
          completedEventKeys: {
            type: [String],
            required: true,
            default: [],
            validate: uniqueStringArrayValidator,
          },
          blockedEventKeys: {
            type: [String],
            required: true,
            default: [],
            validate: uniqueStringArrayValidator,
          },
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
      default: () => ({}),
    },
    ambientState: {
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
          blockedAmbientKeys: {
            type: [String],
            required: true,
            default: [],
            validate: uniqueStringArrayValidator,
          },
          queuedAmbient: {
            type: [queuedAmbientSchema],
            required: true,
            default: [],
          },
        },
        { _id: false },
      ),
      required: true,
      default: () => ({}),
    },
    ending: {
      type: new Schema(
        {
          endingKey: { type: String, required: true },
          triggeredAtDay: {
            type: Number,
            required: true,
            min: 1,
            validate: integerValidator,
          },
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
    timestamps: true,
    versionKey: false,
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
  const pendingEventSequences = this.eventState.pendingEvents.map(
    (event) => event.sequence,
  );
  const characterExpeditionIds = this.characters.flatMap((character) =>
    character.expedition ? [character.expedition.expeditionId] : [],
  );

  if (this.characters.length !== 4) {
    this.invalidate("characters", "a run must contain exactly four characters");
  }

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

  if (
    new Set(pendingEventSequences).size !== pendingEventSequences.length
  ) {
    this.invalidate(
      "eventState.pendingEvents",
      "pending event sequence must be unique within a run",
    );
  }

  if (this.eventState.pendingEvents.length > 3) {
    this.invalidate(
      "eventState.pendingEvents",
      "a run cannot contain more than three pending events",
    );
  }

  if (this.ambientState.queuedAmbient.length > 64) {
    this.invalidate(
      "ambientState.queuedAmbient",
      "a run cannot contain more than 64 queued ambient entries",
    );
  }

  const activeExpeditionIds = [...this.expeditionState.activeExpeditionIds].sort();
  const linkedExpeditionIds = [...characterExpeditionIds].sort();
  if (
    activeExpeditionIds.length !== linkedExpeditionIds.length ||
    activeExpeditionIds.some(
      (expeditionId, index) => expeditionId !== linkedExpeditionIds[index],
    )
  ) {
    this.invalidate(
      "expeditionState.activeExpeditionIds",
      "active expedition ids must match character expedition links",
    );
  }

  const integerMaps: Array<[
    string,
    Map<string, number> | undefined,
  ]> = [
    ["counters", this.counters],
    ["eventState.occurredCounts", this.eventState.occurredCounts],
    ["eventState.lastOccurredDay", this.eventState.lastOccurredDay],
    ["eventState.choiceCounts", this.eventState.choiceCounts],
    ["ambientState.occurredCounts", this.ambientState.occurredCounts],
    ["ambientState.lastOccurredDay", this.ambientState.lastOccurredDay],
  ];

  for (const [path, values] of integerMaps) {
    if (!hasOnlyNonNegativeIntegerValues(values)) {
      this.invalidate(path, `${path} values must be non-negative integers`);
    }
  }

  for (const [key, value] of this.flags.entries()) {
    const isAllowedValue =
      typeof value === "boolean" ||
      typeof value === "string" ||
      (typeof value === "number" && Number.isFinite(value));
    if (!isAllowedValue) {
      this.invalidate(
        `flags.${key}`,
        "flag values must be a boolean, finite number, or string",
      );
    }
  }
});

export type GameRun = InferSchemaType<typeof gameRunSchema>;

export const GameRunModel =
  (models.GameRun as Model<GameRun> | undefined) ??
  model<GameRun>("GameRun", gameRunSchema);
