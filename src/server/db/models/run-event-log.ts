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

const randomRollSchema = new Schema(
  {
    purpose: { type: String, required: true, trim: true },
    value: { type: Number, required: true },
    result: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const appliedEffectSchema = new Schema(
  {
    type: { type: String, required: true, trim: true },
    target: { type: String, trim: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const runEventLogSchema = new Schema(
  {
    runId: { type: Schema.Types.ObjectId, ref: "GameRun", required: true },
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
    commandId: { type: String, trim: true, minlength: 1, maxlength: 100 },
    causationId: { type: String, trim: true, minlength: 1, maxlength: 100 },
    sequence: {
      type: Number,
      required: true,
      min: 0,
      validate: integerValidator,
    },
    day: {
      type: Number,
      required: true,
      min: 1,
      validate: integerValidator,
    },
    action: {
      type: String,
      enum: [
        "advance_day",
        "event_choice",
        "ambient",
        "care",
        "expedition_depart",
        "expedition_progress",
        "expedition_return",
        "report_read",
        "abandon_run",
        "system",
      ],
      required: true,
    },
    expeditionId: { type: String, trim: true },
    locationKey: { type: String, trim: true },
    eventInstanceId: { type: String, trim: true },
    eventKey: { type: String, trim: true },
    ambientKey: { type: String, trim: true },
    choiceKey: { type: String, trim: true },
    selectedItemKey: { type: String, trim: true },
    characterKey: { type: String, trim: true },
    careAction: { type: String, enum: ["feed", "hydrate", "heal"] },
    itemBranchKey: { type: String, trim: true },
    fallbackUsed: { type: Boolean },
    resolutionMode: {
      type: String,
      enum: ["deterministic", "weighted"],
    },
    resultKey: { type: String, trim: true },
    resultTitle: { type: String, trim: true, maxlength: 160 },
    resultDescription: { type: String, trim: true, maxlength: 2_000 },
    randomRolls: { type: [randomRollSchema], required: true, default: [] },
    appliedEffects: {
      type: [appliedEffectSchema],
      required: true,
      default: [],
    },
    stateHash: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 256,
    },
  },
  {
    collection: "run_event_logs",
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

runEventLogSchema.index({ runId: 1, sequence: 1 }, { unique: true });
runEventLogSchema.index(
  { runId: 1, commandId: 1 },
  {
    unique: true,
    partialFilterExpression: { commandId: { $type: "string" } },
  },
);
runEventLogSchema.index({ runId: 1, day: 1, sequence: 1 });
runEventLogSchema.index({ runId: 1, causationId: 1, sequence: 1 });
runEventLogSchema.index({ runId: 1, expeditionId: 1, sequence: 1 });
runEventLogSchema.index({ runId: 1, eventInstanceId: 1 });

runEventLogSchema.pre("validate", function validateActionReferences() {
  if (
    this.action === "event_choice" &&
    (!this.eventInstanceId || !this.eventKey)
  ) {
    this.invalidate(
      "eventInstanceId",
      "event choice logs require eventInstanceId and eventKey",
    );
  }

  if (this.action === "event_choice") {
    const intentCount = [
      Boolean(this.choiceKey),
      Boolean(this.selectedItemKey),
      this.fallbackUsed === true,
    ].filter(Boolean).length;
    if (intentCount !== 1) {
      this.invalidate(
        "choiceKey",
        "event choice logs require exactly one choice, selected item, or fallback intent",
      );
    }
  }

  if (this.action === "ambient" && !this.ambientKey) {
    this.invalidate("ambientKey", "ambient logs require ambientKey");
  }

  if (this.action === "care" && (!this.characterKey || !this.selectedItemKey || !this.careAction)) {
    this.invalidate("characterKey", "care logs require characterKey, selectedItemKey, and careAction");
  }

  if (
    ["event_choice", "ambient"].includes(this.action) &&
    !this.resolutionMode
  ) {
    this.invalidate(
      "resolutionMode",
      "resolved event and ambient logs require resolutionMode",
    );
  }

  if (this.resolutionMode === "weighted" && !this.resultKey) {
    this.invalidate("resultKey", "weighted resolution logs require resultKey");
  }
});

runEventLogSchema.pre("save", function rejectDocumentUpdates() {
  if (!this.isNew) {
    throw new Error("run event logs are append-only");
  }
});

function rejectLogMutation(): never {
  throw new Error("run event logs are append-only");
}

runEventLogSchema.pre("updateOne", rejectLogMutation);
runEventLogSchema.pre("updateMany", rejectLogMutation);
runEventLogSchema.pre("findOneAndUpdate", rejectLogMutation);
runEventLogSchema.pre("replaceOne", rejectLogMutation);
runEventLogSchema.pre("deleteOne", rejectLogMutation);
runEventLogSchema.pre(
  "deleteOne",
  { document: true, query: false },
  rejectLogMutation,
);
runEventLogSchema.pre("deleteMany", rejectLogMutation);
runEventLogSchema.pre("findOneAndDelete", rejectLogMutation);

export type RunEventLog = InferSchemaType<typeof runEventLogSchema>;

export const RunEventLogModel =
  (models.RunEventLog as Model<RunEventLog> | undefined) ??
  model<RunEventLog>("RunEventLog", runEventLogSchema);
