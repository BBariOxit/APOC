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

const userAchievementSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    achievementKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:_[a-z0-9]+)*$/,
    },
    progress: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: integerValidator,
    },
    completed: { type: Boolean, required: true, default: false },
    unlockedAt: { type: Date },
    sourceRunId: { type: Schema.Types.ObjectId, ref: "GameRun" },
  },
  { collection: "user_achievements", timestamps: true },
);

userAchievementSchema.index(
  { userId: 1, achievementKey: 1 },
  { unique: true },
);
userAchievementSchema.index({ achievementKey: 1, completed: 1 });
userAchievementSchema.index({ userId: 1, completed: 1, updatedAt: -1 });

userAchievementSchema.pre("validate", function validateCompletionState() {
  if (this.completed && !this.unlockedAt) {
    this.invalidate("unlockedAt", "completed achievements require unlockedAt");
  }
  if (!this.completed && this.unlockedAt) {
    this.invalidate(
      "unlockedAt",
      "incomplete achievements cannot have unlockedAt",
    );
  }
});

export type UserAchievement = InferSchemaType<typeof userAchievementSchema>;

export const UserAchievementModel =
  (models.UserAchievement as Model<UserAchievement> | undefined) ??
  model<UserAchievement>("UserAchievement", userAchievementSchema);
