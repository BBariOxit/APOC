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

const appliedEffectSchema = new Schema(
  {
    type: { type: String, required: true, trim: true },
    target: { type: String, trim: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const journalEntrySchema = new Schema(
  {
    sequence: {
      type: Number,
      required: true,
      min: 0,
      validate: integerValidator,
    },
    expeditionDay: {
      type: Number,
      required: true,
      min: 1,
      validate: integerValidator,
    },
    runDay: {
      type: Number,
      required: true,
      min: 1,
      validate: integerValidator,
    },
    locationKey: { type: String, required: true, trim: true },
    eventKey: { type: String, required: true, trim: true },
    itemBranchKey: { type: String, trim: true },
    resolutionMode: {
      type: String,
      enum: ["deterministic", "weighted"],
      required: true,
    },
    resultKey: { type: String, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    text: { type: String, required: true, trim: true, maxlength: 4_000 },
    reason: { type: String, trim: true, maxlength: 500 },
    appliedEffects: {
      type: [appliedEffectSchema],
      required: true,
      default: [],
    },
  },
  { _id: false },
);

const returnedItemDeltaSchema = new Schema(
  {
    itemKey: { type: String, required: true, trim: true },
    condition: {
      type: String,
      enum: ["intact", "broken"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: integerValidator,
    },
  },
  { _id: false },
);

const characterStatDeltasSchema = new Schema(
  {
    health: { type: Number, validate: integerValidator },
    satiety: { type: Number, validate: integerValidator },
    hydration: { type: Number, validate: integerValidator },
    sanity: { type: Number, validate: integerValidator },
  },
  { _id: false },
);

const runExpeditionSchema = new Schema(
  {
    runId: { type: Schema.Types.ObjectId, ref: "GameRun", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    contentVersionId: {
      type: Schema.Types.ObjectId,
      ref: "ContentVersion",
      required: true,
    },
    expeditionId: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    characterKey: { type: String, required: true, trim: true },
    loadoutSlotCapacity: {
      type: Number,
      required: true,
      min: 0,
      max: 8,
      validate: integerValidator,
    },
    status: {
      type: String,
      enum: ["active", "returned", "missing", "dead"],
      required: true,
      default: "active",
    },
    departedDay: {
      type: Number,
      required: true,
      min: 1,
      validate: integerValidator,
    },
    returnedDay: { type: Number, min: 1, validate: integerValidator },
    currentExpeditionDay: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
      max: 30,
      validate: integerValidator,
    },
    currentLocationKey: { type: String, trim: true },
    initialLoadout: {
      type: [inventoryEntrySchema],
      required: true,
      default: [],
    },
    carriedInventory: {
      type: [inventoryEntrySchema],
      required: true,
      default: [],
    },
    journalEntries: {
      type: [journalEntrySchema],
      required: true,
      default: [],
    },
    summary: {
      type: new Schema(
        {
          returnedItemDeltas: {
            type: [returnedItemDeltaSchema],
            required: true,
            default: [],
          },
          characterStatDeltas: {
            type: characterStatDeltasSchema,
            required: true,
            default: () => ({}),
          },
          brokenItemKeys: {
            type: [String],
            required: true,
            default: [],
            validate: uniqueStringArrayValidator,
          },
          discoveredLocationKeys: {
            type: [String],
            required: true,
            default: [],
            validate: uniqueStringArrayValidator,
          },
        },
        { _id: false },
      ),
    },
    report: {
      type: new Schema(
        {
          visibility: {
            type: String,
            enum: ["hidden", "available", "read", "archived"],
            required: true,
            default: "hidden",
          },
          availableAt: { type: Date },
          readAt: { type: Date },
          archivedAt: { type: Date },
        },
        { _id: false },
      ),
      required: true,
      default: () => ({}),
    },
  },
  { collection: "run_expeditions", timestamps: true, versionKey: false },
);

runExpeditionSchema.index({ runId: 1, expeditionId: 1 }, { unique: true });
runExpeditionSchema.index({ runId: 1, status: 1 });
runExpeditionSchema.index({
  runId: 1,
  "report.visibility": 1,
  returnedDay: -1,
});
runExpeditionSchema.index({ userId: 1, status: 1, updatedAt: -1 });
runExpeditionSchema.index({ contentVersionId: 1, status: 1 });

runExpeditionSchema.pre("validate", function validateExpeditionState() {
  const validateUniqueInventory = (
    path: "initialLoadout" | "carriedInventory",
    inventory: typeof this.initialLoadout,
  ) => {
    const itemKeys = inventory.map(({ itemKey }) => itemKey);
    if (new Set(itemKeys).size !== itemKeys.length) {
      this.invalidate(path, `${path} must contain one entry per item key`);
    }
    if (
      inventory.some(
        ({ intactQuantity, brokenQuantity }) =>
          intactQuantity + brokenQuantity === 0,
      )
    ) {
      this.invalidate(path, `${path} cannot contain zero-quantity entries`);
    }
  };

  validateUniqueInventory("initialLoadout", this.initialLoadout);
  validateUniqueInventory("carriedInventory", this.carriedInventory);

  const initialLoadoutUnits = this.initialLoadout.reduce(
    (total, item) => total + item.intactQuantity + item.brokenQuantity,
    0,
  );
  if (initialLoadoutUnits > this.loadoutSlotCapacity) {
    this.invalidate(
      "initialLoadout",
      "initial loadout cannot exceed the snapshotted slot capacity",
    );
  }

  if (this.journalEntries.length > 100) {
    this.invalidate(
      "journalEntries",
      "an expedition cannot contain more than 100 journal entries",
    );
  }
  for (let index = 0; index < this.journalEntries.length; index += 1) {
    const entry = this.journalEntries[index];
    const previous = this.journalEntries[index - 1];
    if (previous && entry.sequence <= previous.sequence) {
      this.invalidate(
        `journalEntries.${index}.sequence`,
        "journal sequences must be unique and strictly increasing",
      );
    }
    if (entry.expeditionDay > this.currentExpeditionDay) {
      this.invalidate(
        `journalEntries.${index}.expeditionDay`,
        "journal day cannot be ahead of current expedition day",
      );
    }
    if (entry.resolutionMode === "weighted" && !entry.resultKey) {
      this.invalidate(
        `journalEntries.${index}.resultKey`,
        "weighted journal resolutions require resultKey",
      );
    }
    if (entry.resolutionMode === "deterministic" && entry.resultKey) {
      this.invalidate(
        `journalEntries.${index}.resultKey`,
        "deterministic journal resolutions cannot have resultKey",
      );
    }
  }

  if (this.status !== "returned" && this.returnedDay != null) {
    this.invalidate("returnedDay", "only returned expeditions can have returnedDay");
  }
  if (this.status === "returned" && this.returnedDay == null) {
    this.invalidate("returnedDay", "returned expeditions require returnedDay");
  }
  if (this.returnedDay != null && this.returnedDay < this.departedDay) {
    this.invalidate("returnedDay", "returnedDay cannot precede departedDay");
  }
  if (this.status === "active" && this.report.visibility !== "hidden") {
    this.invalidate("report.visibility", "active expedition reports must be hidden");
  }
  if (this.status === "returned" && this.report.visibility === "hidden") {
    this.invalidate(
      "report.visibility",
      "returned expedition reports must be available, read, or archived",
    );
  }

  const visibility = this.report.visibility;
  if (
    visibility === "hidden" &&
    (this.report.availableAt || this.report.readAt || this.report.archivedAt)
  ) {
    this.invalidate("report", "hidden reports cannot have lifecycle timestamps");
  }
  if (visibility !== "hidden" && !this.report.availableAt) {
    this.invalidate("report.availableAt", "visible reports require availableAt");
  }
  if (["read", "archived"].includes(visibility) && !this.report.readAt) {
    this.invalidate("report.readAt", "read or archived reports require readAt");
  }
  if (visibility === "available" && this.report.readAt) {
    this.invalidate("report.readAt", "available reports cannot have readAt");
  }
  if (visibility === "archived" && !this.report.archivedAt) {
    this.invalidate("report.archivedAt", "archived reports require archivedAt");
  }
  if (visibility !== "archived" && this.report.archivedAt) {
    this.invalidate(
      "report.archivedAt",
      "only archived reports can have archivedAt",
    );
  }
  if (
    this.report.availableAt &&
    this.report.readAt &&
    this.report.readAt < this.report.availableAt
  ) {
    this.invalidate("report.readAt", "readAt cannot precede availableAt");
  }
  if (
    this.report.readAt &&
    this.report.archivedAt &&
    this.report.archivedAt < this.report.readAt
  ) {
    this.invalidate("report.archivedAt", "archivedAt cannot precede readAt");
  }
});

export type RunExpedition = InferSchemaType<typeof runExpeditionSchema>;

export const RunExpeditionModel =
  (models.RunExpedition as Model<RunExpedition> | undefined) ??
  model<RunExpedition>("RunExpedition", runExpeditionSchema);
