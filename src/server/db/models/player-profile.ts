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

const uniqueKeysValidator = {
  validator: (values: string[]) => new Set(values).size === values.length,
  message: "{PATH} must not contain duplicate keys",
};

const keyArray = {
  type: [
    {
      type: String,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:_[a-z0-9]+)*$/,
    },
  ],
  required: true,
  default: [],
  validate: uniqueKeysValidator,
};

const statisticField = {
  type: Number,
  required: true,
  default: 0,
  min: 0,
  validate: integerValidator,
};

const playerProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    activeRunId: { type: Schema.Types.ObjectId, ref: "GameRun" },
    unlockedItemKeys: keyArray,
    unlockedEventKeys: keyArray,
    discoveredItemKeys: keyArray,
    discoveredEventKeys: keyArray,
    discoveredLocationKeys: keyArray,
    discoveredEndingKeys: keyArray,
    statistics: {
      type: new Schema(
        {
          totalRuns: statisticField,
          completedRuns: statisticField,
          maxSurvivedDays: statisticField,
          totalSurvivedDays: statisticField,
          characterDeaths: statisticField,
          eventsEncountered: statisticField,
        },
        { _id: false },
      ),
      required: true,
      default: () => ({}),
    },
  },
  { collection: "player_profiles", timestamps: true },
);

playerProfileSchema.index({ userId: 1 }, { unique: true });
playerProfileSchema.index(
  { activeRunId: 1 },
  {
    unique: true,
    partialFilterExpression: { activeRunId: { $type: "objectId" } },
  },
);

playerProfileSchema.pre("validate", function validateStatistics() {
  if (this.statistics.completedRuns > this.statistics.totalRuns) {
    this.invalidate(
      "statistics.completedRuns",
      "completed runs cannot exceed total runs",
    );
  }
  if (this.statistics.maxSurvivedDays > this.statistics.totalSurvivedDays) {
    this.invalidate(
      "statistics.maxSurvivedDays",
      "maximum survived days cannot exceed total survived days",
    );
  }
});

export type PlayerProfile = InferSchemaType<typeof playerProfileSchema>;

export const PlayerProfileModel =
  (models.PlayerProfile as Model<PlayerProfile> | undefined) ??
  model<PlayerProfile>("PlayerProfile", playerProfileSchema);
