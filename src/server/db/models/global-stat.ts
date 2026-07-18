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

const globalStatSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["achievement"],
      required: true,
      default: "achievement",
    },
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:_[a-z0-9]+)*$/,
    },
    eligiblePlayers: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: integerValidator,
    },
    unlockedPlayers: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: integerValidator,
    },
    unlockRate: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 1,
    },
  },
  {
    collection: "global_stats",
    timestamps: { createdAt: false, updatedAt: true },
    versionKey: false,
  },
);

globalStatSchema.index({ type: 1, key: 1 }, { unique: true });
globalStatSchema.index({ type: 1, unlockRate: 1 });
globalStatSchema.index({ updatedAt: 1 });

globalStatSchema.pre("validate", function deriveUnlockRate() {
  if (this.unlockedPlayers > this.eligiblePlayers) {
    this.invalidate(
      "unlockedPlayers",
      "unlocked players cannot exceed eligible players",
    );
    return;
  }
  this.unlockRate =
    this.eligiblePlayers === 0
      ? 0
      : this.unlockedPlayers / this.eligiblePlayers;
});

export type GlobalStat = InferSchemaType<typeof globalStatSchema>;

export const GlobalStatModel =
  (models.GlobalStat as Model<GlobalStat> | undefined) ??
  model<GlobalStat>("GlobalStat", globalStatSchema);
