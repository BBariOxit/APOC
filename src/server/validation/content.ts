import "server-only";

import { z } from "zod";

export const contentKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/);

const nonNegativeIntegerSchema = z.number().int().min(0);
const positiveIntegerSchema = z.number().int().positive();
const itemConditionSchema = z.enum(["intact", "broken"]);
const characterStateSchema = z.enum([
  "shelter",
  "expedition",
  "missing",
  "dead",
  "insane",
]);
const characterStatSchema = z.enum([
  "health",
  "satiety",
  "hydration",
  "sanity",
]);

const uniqueContentKeysSchema = z
  .array(contentKeySchema)
  .max(64)
  .refine((values) => new Set(values).size === values.length, {
    message: "content keys must not contain duplicates",
  });

const optionalUrlSchema = z.string().trim().url().max(2_000).optional();

const baseStatsSchema = z
  .object({
    health: z.number().int().min(0).max(100),
    satiety: z.number().int().min(0).max(100),
    hydration: z.number().int().min(0).max(100),
    sanity: z.number().int().min(0).max(100),
  })
  .strict();

export const gameRuleDefinitionContentSchema = z
  .object({
    runSetup: z
      .object({
        characterKeys: z
          .array(contentKeySchema)
          .max(4)
          .refine((values) => new Set(values).size === values.length, {
            message: "starting character keys must be unique",
          }),
        inventory: z
          .array(
            z
              .object({
                itemKey: contentKeySchema,
                intactQuantity: nonNegativeIntegerSchema,
                brokenQuantity: nonNegativeIntegerSchema,
              })
              .strict()
              .refine(
                ({ intactQuantity, brokenQuantity }) =>
                  intactQuantity + brokenQuantity > 0,
                { message: "an inventory entry must contain at least one item" },
              ),
          )
          .max(64)
          .refine(
            (entries) =>
              new Set(entries.map(({ itemKey }) => itemKey)).size ===
              entries.length,
            { message: "starting inventory item keys must be unique" },
          ),
      })
      .strict(),
    statRules: z
      .object({ criticalBelow: z.number().int().min(1).max(100) })
      .strict(),
    dailyRules: z
      .object({
        maxEventsPerDay: z.number().int().min(1).max(3),
        maxAmbientPerDay: z.number().int().min(0).max(1),
        ambientChance: z.number().min(0).max(1),
        foodUnitsPerCharacter: nonNegativeIntegerSchema,
        waterUnitsPerCharacter: nonNegativeIntegerSchema,
        hungerStatLoss: z.number().int().min(0).max(100),
        thirstStatLoss: z.number().int().min(0).max(100),
      })
      .strict(),
    expeditionRules: z
      .object({
        visibleLoadoutSlots: z.number().int().min(1).max(8),
        healthPerLostSlot: z.number().int().min(1).max(100),
        returnCooldownDays: z.number().int().min(0).max(30),
        maxDurationDays: z.number().int().min(1).max(30),
        maxJournalEntries: z.number().int().min(1).max(100),
      })
      .strict(),
  })
  .strict();

export type RuleInput =
  | { all: RuleInput[] }
  | { any: RuleInput[] }
  | { not: RuleInput }
  | { type: "day_gte" | "day_lte"; value: number }
  | {
      type: "has_item";
      itemKey: string;
      condition?: "intact" | "broken";
      quantity: number;
      scope?: "shelter" | "carried_inventory";
    }
  | {
      type: "flag_equals";
      key: string;
      value: boolean | number | string;
    }
  | { type: "counter_gte"; key: string; value: number }
  | { type: "event_completed"; eventKey: string }
  | { type: "event_choice_made"; eventKey: string; choiceKey: string }
  | { type: "achievement_unlocked"; achievementKey: string }
  | { type: "location_discovered"; locationKey: string }
  | { type: "location_visited"; locationKey: string; minVisits?: number }
  | { type: "current_location"; locationKey: string }
  | { type: "expedition_day_gte"; value: number }
  | { type: "character_state"; characterKey: string; state: string }
  | { type: "alive_count_gte"; value: number };

export const ruleSchema: z.ZodType<RuleInput> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(ruleSchema).min(1) }).strict(),
    z.object({ any: z.array(ruleSchema).min(1) }).strict(),
    z.object({ not: ruleSchema }).strict(),
    z
      .object({
        type: z.enum(["day_gte", "day_lte"]),
        value: positiveIntegerSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("has_item"),
        itemKey: contentKeySchema,
        condition: itemConditionSchema.optional(),
        quantity: positiveIntegerSchema,
        scope: z.enum(["shelter", "carried_inventory"]).optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal("flag_equals"),
        key: contentKeySchema,
        value: z.union([z.boolean(), z.number().finite(), z.string()]),
      })
      .strict(),
    z
      .object({
        type: z.literal("counter_gte"),
        key: contentKeySchema,
        value: nonNegativeIntegerSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("event_completed"),
        eventKey: contentKeySchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("event_choice_made"),
        eventKey: contentKeySchema,
        choiceKey: contentKeySchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("achievement_unlocked"),
        achievementKey: contentKeySchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("location_discovered"),
        locationKey: contentKeySchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("location_visited"),
        locationKey: contentKeySchema,
        minVisits: positiveIntegerSchema.optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal("current_location"),
        locationKey: contentKeySchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("expedition_day_gte"),
        value: positiveIntegerSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("character_state"),
        characterKey: contentKeySchema,
        state: characterStateSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("alive_count_gte"),
        value: nonNegativeIntegerSchema,
      })
      .strict(),
  ]),
);

const inventoryTargetSchema = z
  .object({ scope: z.enum(["shelter", "carried_inventory"]) })
  .strict();

export const characterTargetSchema = z.discriminatedUnion("mode", [
  z
    .object({ mode: z.literal("character"), characterKey: contentKeySchema })
    .strict(),
  z.object({ mode: z.literal("expedition_character") }).strict(),
  z.object({ mode: z.literal("all_shelter") }).strict(),
]);

export const effectSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("add_item"),
      target: inventoryTargetSchema,
      itemKey: contentKeySchema,
      condition: itemConditionSchema,
      quantity: positiveIntegerSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("remove_item"),
      target: inventoryTargetSchema,
      itemKey: contentKeySchema,
      condition: itemConditionSchema,
      quantity: positiveIntegerSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("break_item"),
      target: inventoryTargetSchema,
      itemKey: contentKeySchema,
      quantity: positiveIntegerSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("repair_item"),
      target: inventoryTargetSchema,
      itemKey: contentKeySchema,
      quantity: positiveIntegerSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("modify_character_stat"),
      target: characterTargetSchema,
      stat: characterStatSchema,
      amount: z.number().int(),
    })
    .strict(),
  z
    .object({
      type: z.literal("add_condition"),
      target: characterTargetSchema,
      condition: contentKeySchema,
      severity: positiveIntegerSchema.optional(),
      days: positiveIntegerSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("remove_condition"),
      target: characterTargetSchema,
      condition: contentKeySchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("change_character_state"),
      target: characterTargetSchema,
      state: characterStateSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("kill_character"),
      target: characterTargetSchema,
      cause: z.string().trim().min(1).max(240),
    })
    .strict(),
  z
    .object({
      type: z.literal("set_flag"),
      key: contentKeySchema,
      value: z.union([z.boolean(), z.number().finite(), z.string()]),
    })
    .strict(),
  z
    .object({
      type: z.literal("increment_counter"),
      key: contentKeySchema,
      amount: z.number().int(),
    })
    .strict(),
  z
    .object({
      type: z.literal("queue_event"),
      eventKey: contentKeySchema,
      delayDays: nonNegativeIntegerSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("cancel_queued_event"),
      eventKey: contentKeySchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("queue_ambient"),
      ambientKey: contentKeySchema,
      delayDays: nonNegativeIntegerSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("cancel_queued_ambient"),
      ambientKey: contentKeySchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("unlock_event_in_run"),
      eventKey: contentKeySchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("unlock_event_for_account"),
      eventKey: contentKeySchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("unlock_item_for_account"),
      itemKey: contentKeySchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("discover_location"),
      locationKey: contentKeySchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("mark_location_depleted"),
      locationKey: contentKeySchema,
      days: positiveIntegerSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("force_expedition_return"),
      reason: z.string().trim().min(1).max(240),
    })
    .strict(),
  z
    .object({
      type: z.literal("grant_achievement"),
      achievementKey: contentKeySchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("trigger_ending"),
      endingKey: contentKeySchema,
    })
    .strict(),
]);

const weightedResultSchema = z
  .object({
    key: contentKeySchema,
    weight: positiveIntegerSchema,
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(2_000),
    requirements: ruleSchema.optional(),
    effects: z.array(effectSchema).max(32),
  })
  .strict();

export const eventResolutionSchema = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("deterministic"),
      title: z.string().trim().min(1).max(160),
      description: z.string().trim().min(1).max(2_000),
      effects: z.array(effectSchema).max(32),
    })
    .strict(),
  z
    .object({
      mode: z.literal("weighted"),
      outcomes: z.array(weightedResultSchema).min(2).max(16),
    })
    .strict()
    .superRefine(({ outcomes }, context) => {
      const keys = outcomes.map(({ key }) => key);
      if (new Set(keys).size !== keys.length) {
        context.addIssue({
          code: "custom",
          message: "weighted outcome keys must be unique",
          path: ["outcomes"],
        });
      }
    }),
]);

const eventChoiceSchema = z
  .object({
    key: contentKeySchema,
    label: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(500).optional(),
    requirements: ruleSchema.optional(),
    fallbackOnly: z.boolean().optional(),
    resolution: eventResolutionSchema,
  })
  .strict();

const itemEventBranchSchema = z
  .object({
    key: contentKeySchema,
    itemKey: contentKeySchema,
    condition: itemConditionSchema.optional(),
    quantity: positiveIntegerSchema,
    priority: nonNegativeIntegerSchema.optional(),
    requirements: ruleSchema.optional(),
    resolution: eventResolutionSchema,
  })
  .strict();

export const eventInteractionSchema = z
  .discriminatedUnion("mode", [
    z
      .object({
        mode: z.literal("choices"),
        choices: z.array(eventChoiceSchema).min(1).max(12),
      })
      .strict(),
    z
      .object({
        mode: z.literal("item_selection"),
        source: z.enum(["player", "carried_inventory"]),
        itemBranches: z.array(itemEventBranchSchema).min(1).max(24),
        noItemBranch: z
          .object({
            label: z.string().trim().min(1).max(120),
            description: z.string().trim().min(1).max(500).optional(),
            availability: z.enum(["fallback_only", "always"]),
            resolution: eventResolutionSchema,
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        mode: z.literal("scripted"),
        resolution: eventResolutionSchema,
      })
      .strict(),
  ])
  .superRefine((interaction, context) => {
    if (interaction.mode === "choices") {
      const keys = interaction.choices.map(({ key }) => key);
      if (new Set(keys).size !== keys.length) {
        context.addIssue({
          code: "custom",
          message: "choice keys must be unique",
          path: ["choices"],
        });
      }

      const fallbackChoices = interaction.choices.filter(
        ({ fallbackOnly }) => fallbackOnly,
      );
      if (fallbackChoices.length > 1) {
        context.addIssue({
          code: "custom",
          message: "an event can have at most one fallback choice",
          path: ["choices"],
        });
      }
      if (fallbackChoices.some(({ requirements }) => requirements)) {
        context.addIssue({
          code: "custom",
          message: "a fallback choice cannot have requirements",
          path: ["choices"],
        });
      }

      const normalChoices = interaction.choices.filter(
        ({ fallbackOnly }) => !fallbackOnly,
      );
      if (
        normalChoices.every(({ requirements }) => requirements) &&
        fallbackChoices.length === 0
      ) {
        context.addIssue({
          code: "custom",
          message:
            "an event whose normal choices all have requirements needs a fallback choice",
          path: ["choices"],
        });
      }
      return;
    }

    if (interaction.mode === "item_selection") {
      const keys = interaction.itemBranches.map(({ key }) => key);
      if (new Set(keys).size !== keys.length) {
        context.addIssue({
          code: "custom",
          message: "item branch keys must be unique",
          path: ["itemBranches"],
        });
      }

      const itemConditions = interaction.itemBranches.map(
        ({ itemKey, condition }) => `${itemKey}:${condition ?? "any"}`,
      );
      if (new Set(itemConditions).size !== itemConditions.length) {
        context.addIssue({
          code: "custom",
          message: "item and condition combinations must be unique",
          path: ["itemBranches"],
        });
      }

      if (
        interaction.source === "carried_inventory" &&
        interaction.noItemBranch.availability !== "fallback_only"
      ) {
        context.addIssue({
          code: "custom",
          message:
            "carried inventory item selection requires a fallback-only no-item branch",
          path: ["noItemBranch", "availability"],
        });
      }

      if (interaction.source === "carried_inventory") {
        const priorities = interaction.itemBranches.map(({ priority }) =>
          priority === undefined ? null : priority,
        );
        if (priorities.some((priority) => priority === null)) {
          context.addIssue({
            code: "custom",
            message: "carried inventory item branches require explicit priority",
            path: ["itemBranches"],
          });
        }
        const numericPriorities = priorities.filter(
          (priority): priority is number => priority !== null,
        );
        if (new Set(numericPriorities).size !== numericPriorities.length) {
          context.addIssue({
            code: "custom",
            message: "carried inventory item branch priorities must be unique",
            path: ["itemBranches"],
          });
        }
      }
    }
  });

export const eventTriggerSchema = z
  .object({
    mode: z.enum([
      "random",
      "fixed_day",
      "scheduled",
      "chained",
      "location_pool",
      "manual",
    ]),
    fixedDay: positiveIntegerSchema.optional(),
    minDay: positiveIntegerSchema.optional(),
    maxDay: positiveIntegerSchema.optional(),
    maxOccurrences: positiveIntegerSchema.optional(),
    cooldownDays: nonNegativeIntegerSchema.optional(),
  })
  .strict()
  .superRefine((trigger, context) => {
    if (trigger.mode === "fixed_day" && trigger.fixedDay === undefined) {
      context.addIssue({
        code: "custom",
        message: "fixed-day events require fixedDay",
        path: ["fixedDay"],
      });
    }
    if (
      trigger.minDay !== undefined &&
      trigger.maxDay !== undefined &&
      trigger.minDay > trigger.maxDay
    ) {
      context.addIssue({
        code: "custom",
        message: "minDay cannot be greater than maxDay",
        path: ["maxDay"],
      });
    }
  });

export const eventDefinitionContentSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(2_000),
    imageUrl: z.string().url().optional(),
    category: z.enum(["story", "daily", "location", "special"]),
    delivery: z.enum(["pending", "expedition"]),
    rarity: z.enum(["common", "uncommon", "rare", "ultra_rare"]),
    weight: positiveIntegerSchema,
    hidden: z.boolean(),
    tags: z.array(contentKeySchema).max(32),
    trigger: eventTriggerSchema,
    requirements: ruleSchema.optional(),
    exclusionEventKeys: z.array(contentKeySchema).max(32),
    mutexGroup: contentKeySchema.optional(),
    interaction: eventInteractionSchema,
  })
  .strict()
  .superRefine((definition, context) => {
    const isExpedition = definition.delivery === "expedition";
    if ((definition.category === "location") !== isExpedition) {
      context.addIssue({
        code: "custom",
        message: "location events must use expedition delivery and vice versa",
        path: ["delivery"],
      });
    }
    if (definition.delivery === "pending" && definition.interaction.mode === "scripted") {
      context.addIssue({
        code: "custom",
        message: "pending events must require a player interaction",
        path: ["interaction", "mode"],
      });
    }
    if (
      definition.delivery === "pending" &&
      definition.interaction.mode === "item_selection" &&
      definition.interaction.source !== "player"
    ) {
      context.addIssue({
        code: "custom",
        message: "pending item selection must use player source",
        path: ["interaction", "source"],
      });
    }
    if (
      definition.delivery === "expedition" &&
      (definition.interaction.mode === "choices" ||
        (definition.interaction.mode === "item_selection" &&
          definition.interaction.source !== "carried_inventory"))
    ) {
      context.addIssue({
        code: "custom",
        message:
          "expedition events must be scripted or select from carried inventory",
        path: ["interaction"],
      });
    }
    if (
      (definition.delivery === "expedition") !==
      (definition.trigger.mode === "location_pool")
    ) {
      context.addIssue({
        code: "custom",
        message:
          "expedition delivery and location-pool trigger must be used together",
        path: ["trigger", "mode"],
      });
    }

    const uniqueArrays: Array<[string, string[]]> = [
      ["tags", definition.tags],
      ["exclusionEventKeys", definition.exclusionEventKeys],
    ];
    for (const [path, values] of uniqueArrays) {
      if (new Set(values).size !== values.length) {
        context.addIssue({
          code: "custom",
          message: `${path} must not contain duplicates`,
          path: [path],
        });
      }
    }
  });

export const ambientTriggerSchema = z
  .object({
    mode: z.enum(["random", "fixed_day", "scheduled"]),
    fixedDay: positiveIntegerSchema.optional(),
    minDay: positiveIntegerSchema.optional(),
    maxDay: positiveIntegerSchema.optional(),
    maxOccurrences: positiveIntegerSchema.optional(),
    cooldownDays: nonNegativeIntegerSchema.optional(),
  })
  .strict()
  .superRefine((trigger, context) => {
    if (trigger.mode === "fixed_day" && trigger.fixedDay === undefined) {
      context.addIssue({
        code: "custom",
        message: "fixed-day ambient content requires fixedDay",
        path: ["fixedDay"],
      });
    }
    if (
      trigger.minDay !== undefined &&
      trigger.maxDay !== undefined &&
      trigger.minDay > trigger.maxDay
    ) {
      context.addIssue({
        code: "custom",
        message: "minDay cannot be greater than maxDay",
        path: ["maxDay"],
      });
    }
  });

export const ambientDefinitionContentSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    timeLabel: z.string().trim().min(1).max(80),
    rarity: z.enum(["common", "uncommon", "rare", "ultra_rare"]),
    weight: positiveIntegerSchema,
    hidden: z.boolean(),
    tags: z.array(contentKeySchema).max(32),
    trigger: ambientTriggerSchema,
    requirements: ruleSchema.optional(),
    exclusionAmbientKeys: z.array(contentKeySchema).max(32),
    mutexGroup: contentKeySchema.optional(),
    resolution: eventResolutionSchema,
  })
  .strict()
  .superRefine((definition, context) => {
    const uniqueArrays: Array<[string, string[]]> = [
      ["tags", definition.tags],
      ["exclusionAmbientKeys", definition.exclusionAmbientKeys],
    ];
    for (const [path, values] of uniqueArrays) {
      if (new Set(values).size !== values.length) {
        context.addIssue({
          code: "custom",
          message: `${path} must not contain duplicates`,
          path: [path],
        });
      }
    }
  });

export const characterDefinitionContentSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(2_000),
    avatarUrl: z.string().trim().url().max(2_000),
    baseStats: baseStatsSchema,
    baseLoadoutSlots: z.number().int().min(1).max(8),
    traits: uniqueContentKeysSchema,
  })
  .strict();

export const itemDefinitionContentSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(2_000),
    iconUrl: z.string().trim().url().max(2_000),
    category: z.enum([
      "food",
      "water",
      "tool",
      "medical",
      "weapon",
      "quest",
    ]),
    stackable: z.boolean(),
    maxStack: positiveIntegerSchema.max(999).optional(),
    canBreak: z.boolean(),
    hidden: z.boolean(),
    tags: uniqueContentKeysSchema,
    accountUnlockRule: ruleSchema.optional(),
  })
  .strict()
  .superRefine((item, context) => {
    if (item.stackable && item.maxStack === undefined) {
      context.addIssue({
        code: "custom",
        path: ["maxStack"],
        message: "stackable items require maxStack",
      });
    }
    if (!item.stackable && item.maxStack !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["maxStack"],
        message: "non-stackable items must not define maxStack",
      });
    }
  });

const locationEventPoolEntrySchema = z
  .object({
    eventKey: contentKeySchema,
    weight: positiveIntegerSchema,
    requirements: ruleSchema.optional(),
    maxOccurrencesPerExpedition: positiveIntegerSchema.optional(),
  })
  .strict();

export const locationDefinitionContentSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(2_000),
    iconUrl: optionalUrlSchema,
    mapPosition: z
      .object({ x: z.number().finite(), y: z.number().finite() })
      .strict()
      .optional(),
    hidden: z.boolean(),
    dangerLevel: z.enum(["low", "medium", "high", "extreme"]),
    travelDays: z
      .object({
        min: positiveIntegerSchema,
        max: positiveIntegerSchema,
      })
      .strict(),
    tags: uniqueContentKeysSchema,
    discoveryRequirements: ruleSchema.optional(),
    eventPool: z.array(locationEventPoolEntrySchema).min(1).max(128),
  })
  .strict()
  .superRefine((location, context) => {
    if (location.travelDays.min > location.travelDays.max) {
      context.addIssue({
        code: "custom",
        path: ["travelDays", "max"],
        message: "maximum travel days cannot be below minimum travel days",
      });
    }
    const eventKeys = location.eventPool.map(({ eventKey }) => eventKey);
    if (new Set(eventKeys).size !== eventKeys.length) {
      context.addIssue({
        code: "custom",
        path: ["eventPool"],
        message: "a location event pool cannot contain duplicate event keys",
      });
    }
  });

export const endingDefinitionContentSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(2_000),
    imageUrl: optionalUrlSchema,
    type: z.enum(["good", "bad", "neutral", "secret", "joke"]),
    priority: nonNegativeIntegerSchema,
    hidden: z.boolean(),
    requirements: ruleSchema.optional(),
  })
  .strict();

export const achievementDefinitionContentSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(2_000),
    iconUrl: optionalUrlSchema,
    difficulty: z.enum(["easy", "medium", "hard"]),
    hidden: z.boolean(),
    progressType: z.enum(["binary", "counter", "best_value"]),
    target: positiveIntegerSchema,
    requirements: ruleSchema,
    rewards: z.array(effectSchema).max(32),
  })
  .strict()
  .superRefine((achievement, context) => {
    if (achievement.progressType === "binary" && achievement.target !== 1) {
      context.addIssue({
        code: "custom",
        path: ["target"],
        message: "binary achievements must have target 1",
      });
    }
  });
