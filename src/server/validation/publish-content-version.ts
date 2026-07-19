import "server-only";

import { isValidObjectId, type ClientSession } from "mongoose";
import type { z } from "zod";

import { connectToDatabase } from "@/server/db/mongoose";
import {
  AchievementDefinitionModel,
  AmbientDefinitionModel,
  CharacterDefinitionModel,
  ContentVersionModel,
  EndingDefinitionModel,
  EventDefinitionModel,
  GameRuleDefinitionModel,
  ItemDefinitionModel,
  LocationDefinitionModel,
} from "@/server/db/models";
import {
  achievementDefinitionContentSchema,
  ambientDefinitionContentSchema,
  characterDefinitionContentSchema,
  endingDefinitionContentSchema,
  eventDefinitionContentSchema,
  gameRuleDefinitionContentSchema,
  itemDefinitionContentSchema,
  locationDefinitionContentSchema,
} from "@/server/validation/content";

type ContentEntityType =
  | "content_version"
  | "rules"
  | "character"
  | "item"
  | "location"
  | "event"
  | "ambient"
  | "ending"
  | "achievement";

export interface ContentPublishIssue {
  severity: "error" | "warning";
  entityType: ContentEntityType;
  entityKey?: string;
  path?: string;
  message: string;
}

export interface ContentPublishValidationResult {
  valid: boolean;
  issues: ContentPublishIssue[];
}

interface CollectedReferences {
  achievementKeys: Set<string>;
  ambientKeys: Set<string>;
  characterKeys: Set<string>;
  endingKeys: Set<string>;
  eventKeys: Set<string>;
  itemKeys: Set<string>;
  locationKeys: Set<string>;
}

type ContentReferenceType = keyof CollectedReferences;

const referenceFields: Record<string, ContentReferenceType> = {
  achievementKey: "achievementKeys",
  ambientKey: "ambientKeys",
  characterKey: "characterKeys",
  endingKey: "endingKeys",
  eventKey: "eventKeys",
  itemKey: "itemKeys",
  locationKey: "locationKeys",
};

function collectContentReferences(value: unknown): CollectedReferences {
  const references: CollectedReferences = {
    achievementKeys: new Set(),
    ambientKeys: new Set(),
    characterKeys: new Set(),
    endingKeys: new Set(),
    eventKeys: new Set(),
    itemKeys: new Set(),
    locationKeys: new Set(),
  };

  function visit(current: unknown): void {
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (!current || typeof current !== "object") {
      return;
    }

    const record = current as Record<string, unknown>;
    for (const [field, collection] of Object.entries(referenceFields)) {
      if (typeof record[field] === "string") {
        references[collection].add(record[field]);
      }
    }
    Object.values(record).forEach(visit);
  }

  visit(value);
  return references;
}

function containsImmediateSelfQueue(
  value: unknown,
  type: "queue_event" | "queue_ambient",
  keyField: "eventKey" | "ambientKey",
  key: string,
): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) =>
      containsImmediateSelfQueue(entry, type, keyField, key),
    );
  }
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (
    record.type === type &&
    record[keyField] === key &&
    record.delayDays === 0
  ) {
    return true;
  }
  return Object.values(record).some((entry) =>
    containsImmediateSelfQueue(entry, type, keyField, key),
  );
}

function pushZodIssues(
  issues: ContentPublishIssue[],
  entityType: ContentEntityType,
  entityKey: string,
  result: z.ZodSafeParseResult<unknown>,
): boolean {
  if (result.success) {
    return true;
  }
  for (const issue of result.error.issues) {
    issues.push({
      severity: "error",
      entityType,
      entityKey,
      path: issue.path.join("."),
      message: issue.message,
    });
  }
  return false;
}

function addMissingReferenceIssues(
  issues: ContentPublishIssue[],
  owner: { entityType: ContentEntityType; entityKey: string },
  references: CollectedReferences,
  available: CollectedReferences,
): void {
  const labels: Record<ContentReferenceType, string> = {
    achievementKeys: "achievement",
    ambientKeys: "ambient",
    characterKeys: "character",
    endingKeys: "ending",
    eventKeys: "event",
    itemKeys: "item",
    locationKeys: "location",
  };

  for (const collection of Object.keys(references) as ContentReferenceType[]) {
    for (const key of references[collection]) {
      if (!available[collection].has(key)) {
        issues.push({
          severity: "error",
          ...owner,
          message: `referenced ${labels[collection]} ${key} does not exist in this content version`,
        });
      }
    }
  }
}

export async function validateContentVersionForPublish(
  contentVersionId: string,
  session?: ClientSession,
): Promise<ContentPublishValidationResult> {
  const issues: ContentPublishIssue[] = [];

  if (!isValidObjectId(contentVersionId)) {
    return {
      valid: false,
      issues: [
        {
          severity: "error",
          entityType: "content_version",
          message: "contentVersionId is not a valid ObjectId",
        },
      ],
    };
  }

  await connectToDatabase();

  const [
    version,
    ruleDefinitions,
    characters,
    items,
    locations,
    events,
    ambientDefinitions,
    endings,
    achievements,
  ] = await Promise.all([
    ContentVersionModel.findById(contentVersionId).session(session ?? null).lean().exec(),
    GameRuleDefinitionModel.find({ contentVersionId }).session(session ?? null).lean().exec(),
    CharacterDefinitionModel.find({ contentVersionId }).session(session ?? null).lean().exec(),
    ItemDefinitionModel.find({ contentVersionId }).session(session ?? null).lean().exec(),
    LocationDefinitionModel.find({ contentVersionId }).session(session ?? null).lean().exec(),
    EventDefinitionModel.find({ contentVersionId }).session(session ?? null).lean().exec(),
    AmbientDefinitionModel.find({ contentVersionId }).session(session ?? null).lean().exec(),
    EndingDefinitionModel.find({ contentVersionId }).session(session ?? null).lean().exec(),
    AchievementDefinitionModel.find({ contentVersionId }).session(session ?? null).lean().exec(),
  ]);

  if (!version) {
    issues.push({
      severity: "error",
      entityType: "content_version",
      message: "content version does not exist",
    });
  } else if (version.status !== "draft") {
    issues.push({
      severity: "error",
      entityType: "content_version",
      message: "only draft content versions can be published",
    });
  }
  if (ruleDefinitions.length !== 1) {
    issues.push({
      severity: "error",
      entityType: "rules",
      message: `content version must have exactly one rules document; found ${ruleDefinitions.length}`,
    });
  } else {
    const rules = ruleDefinitions[0];
    const parsed = gameRuleDefinitionContentSchema.safeParse({
      statRules: rules.statRules,
      dailyRules: rules.dailyRules,
      expeditionRules: rules.expeditionRules,
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        issues.push({
          severity: "error",
          entityType: "rules",
          path: issue.path.join("."),
          message: issue.message,
        });
      }
    }
  }
  if (characters.filter(({ enabled }) => enabled).length < 4) {
    issues.push({
      severity: "error",
      entityType: "character",
      message: "a publishable version requires at least four enabled characters",
    });
  }
  if (!endings.some(({ enabled }) => enabled)) {
    issues.push({
      severity: "error",
      entityType: "ending",
      message: "a publishable version requires at least one enabled ending",
    });
  }

  const available: CollectedReferences = {
    achievementKeys: new Set(achievements.map(({ key }) => key)),
    ambientKeys: new Set(ambientDefinitions.map(({ key }) => key)),
    characterKeys: new Set(characters.map(({ key }) => key)),
    endingKeys: new Set(endings.map(({ key }) => key)),
    eventKeys: new Set(events.map(({ key }) => key)),
    itemKeys: new Set(items.map(({ key }) => key)),
    locationKeys: new Set(locations.map(({ key }) => key)),
  };

  for (const character of characters) {
    const parsed = characterDefinitionContentSchema.safeParse({
      name: character.name,
      description: character.description,
      avatarUrl: character.avatarUrl,
      baseStats: character.baseStats,
      baseLoadoutSlots: character.baseLoadoutSlots,
      traits: character.traits,
    });
    pushZodIssues(issues, "character", character.key, parsed);
  }

  for (const item of items) {
    const parsed = itemDefinitionContentSchema.safeParse({
      name: item.name,
      description: item.description,
      iconUrl: item.iconUrl,
      category: item.category,
      stackable: item.stackable,
      maxStack: item.maxStack,
      canBreak: item.canBreak,
      hidden: item.hidden,
      tags: item.tags,
      accountUnlockRule: item.accountUnlockRule,
    });
    if (pushZodIssues(issues, "item", item.key, parsed) && parsed.success) {
      addMissingReferenceIssues(
        issues,
        { entityType: "item", entityKey: item.key },
        collectContentReferences(parsed.data),
        available,
      );
    }
  }

  const eventByKey = new Map(events.map((event) => [event.key, event]));
  for (const location of locations) {
    const parsed = locationDefinitionContentSchema.safeParse({
      name: location.name,
      description: location.description,
      iconUrl: location.iconUrl,
      mapPosition: location.mapPosition,
      hidden: location.hidden,
      dangerLevel: location.dangerLevel,
      travelDays: location.travelDays,
      tags: location.tags,
      discoveryRequirements: location.discoveryRequirements,
      eventPool: location.eventPool,
    });
    if (
      pushZodIssues(issues, "location", location.key, parsed) &&
      parsed.success
    ) {
      addMissingReferenceIssues(
        issues,
        { entityType: "location", entityKey: location.key },
        collectContentReferences(parsed.data),
        available,
      );
      for (const entry of parsed.data.eventPool) {
        const event = eventByKey.get(entry.eventKey);
        if (
          event &&
          (event.category !== "location" || event.delivery !== "expedition")
        ) {
          issues.push({
            severity: "error",
            entityType: "location",
            entityKey: location.key,
            path: "eventPool",
            message: `event ${entry.eventKey} must be a location event with expedition delivery`,
          });
        }
      }
    }
  }

  for (const event of events) {
    const parsed = eventDefinitionContentSchema.safeParse({
      name: event.name,
      description: event.description,
      imageUrl: event.imageUrl,
      category: event.category,
      delivery: event.delivery,
      rarity: event.rarity,
      weight: event.weight,
      hidden: event.hidden,
      tags: event.tags,
      trigger: event.trigger,
      requirements: event.requirements,
      exclusionEventKeys: event.exclusionEventKeys,
      mutexGroup: event.mutexGroup,
      interaction: event.interaction,
    });
    if (pushZodIssues(issues, "event", event.key, parsed) && parsed.success) {
      const references = collectContentReferences(parsed.data);
      parsed.data.exclusionEventKeys.forEach((key) =>
        references.eventKeys.add(key),
      );
      if (parsed.data.exclusionEventKeys.includes(event.key)) {
        issues.push({
          severity: "error",
          entityType: "event",
          entityKey: event.key,
          path: "exclusionEventKeys",
          message: "an event cannot exclude itself",
        });
      }
      if (
        containsImmediateSelfQueue(
          parsed.data,
          "queue_event",
          "eventKey",
          event.key,
        )
      ) {
        issues.push({
          severity: "error",
          entityType: "event",
          entityKey: event.key,
          message: "an event cannot immediately queue itself",
        });
      }
      addMissingReferenceIssues(
        issues,
        { entityType: "event", entityKey: event.key },
        references,
        available,
      );
    }
  }

  for (const ambient of ambientDefinitions) {
    const parsed = ambientDefinitionContentSchema.safeParse({
      name: ambient.name,
      timeLabel: ambient.timeLabel,
      rarity: ambient.rarity,
      weight: ambient.weight,
      hidden: ambient.hidden,
      tags: ambient.tags,
      trigger: ambient.trigger,
      requirements: ambient.requirements,
      exclusionAmbientKeys: ambient.exclusionAmbientKeys,
      mutexGroup: ambient.mutexGroup,
      resolution: ambient.resolution,
    });
    if (pushZodIssues(issues, "ambient", ambient.key, parsed) && parsed.success) {
      const references = collectContentReferences(parsed.data);
      parsed.data.exclusionAmbientKeys.forEach((key) =>
        references.ambientKeys.add(key),
      );
      if (parsed.data.exclusionAmbientKeys.includes(ambient.key)) {
        issues.push({
          severity: "error",
          entityType: "ambient",
          entityKey: ambient.key,
          path: "exclusionAmbientKeys",
          message: "ambient content cannot exclude itself",
        });
      }
      if (
        containsImmediateSelfQueue(
          parsed.data,
          "queue_ambient",
          "ambientKey",
          ambient.key,
        )
      ) {
        issues.push({
          severity: "error",
          entityType: "ambient",
          entityKey: ambient.key,
          message: "ambient content cannot immediately queue itself",
        });
      }
      addMissingReferenceIssues(
        issues,
        { entityType: "ambient", entityKey: ambient.key },
        references,
        available,
      );
    }
  }

  const enabledEndingPriorities = new Map<number, string[]>();
  for (const ending of endings) {
    const parsed = endingDefinitionContentSchema.safeParse({
      name: ending.name,
      description: ending.description,
      imageUrl: ending.imageUrl,
      type: ending.type,
      priority: ending.priority,
      hidden: ending.hidden,
      requirements: ending.requirements,
    });
    if (pushZodIssues(issues, "ending", ending.key, parsed) && parsed.success) {
      addMissingReferenceIssues(
        issues,
        { entityType: "ending", entityKey: ending.key },
        collectContentReferences(parsed.data),
        available,
      );
      if (ending.enabled) {
        const keys = enabledEndingPriorities.get(parsed.data.priority) ?? [];
        keys.push(ending.key);
        enabledEndingPriorities.set(parsed.data.priority, keys);
      }
    }
  }
  for (const [priority, keys] of enabledEndingPriorities) {
    if (keys.length > 1) {
      issues.push({
        severity: "warning",
        entityType: "ending",
        path: "priority",
        message: `enabled endings ${keys.join(", ")} share priority ${priority}`,
      });
    }
  }

  for (const achievement of achievements) {
    const parsed = achievementDefinitionContentSchema.safeParse({
      name: achievement.name,
      description: achievement.description,
      iconUrl: achievement.iconUrl,
      difficulty: achievement.difficulty,
      hidden: achievement.hidden,
      progressType: achievement.progressType,
      target: achievement.target,
      requirements: achievement.requirements,
      rewards: achievement.rewards,
    });
    if (
      pushZodIssues(issues, "achievement", achievement.key, parsed) &&
      parsed.success
    ) {
      addMissingReferenceIssues(
        issues,
        { entityType: "achievement", entityKey: achievement.key },
        collectContentReferences(parsed.data),
        available,
      );
    }
  }

  return {
    valid: !issues.some(({ severity }) => severity === "error"),
    issues,
  };
}
