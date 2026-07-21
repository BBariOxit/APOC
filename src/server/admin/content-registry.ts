import "server-only";

import type { Model } from "mongoose";
import { z, type ZodType } from "zod";

import {
  AchievementDefinitionModel,
  AmbientDefinitionModel,
  CharacterDefinitionModel,
  ConditionDefinitionModel,
  EndingDefinitionModel,
  EventDefinitionModel,
  ItemDefinitionModel,
  LocationDefinitionModel,
} from "@/server/db/models";
import {
  achievementDefinitionContentSchema,
  ambientDefinitionContentSchema,
  characterDefinitionContentSchema,
  conditionDefinitionContentSchema,
  endingDefinitionContentSchema,
  eventDefinitionContentSchema,
  itemDefinitionContentSchema,
  locationDefinitionContentSchema,
} from "@/server/validation/content";

export const contentResourceSchema = z.enum([
  "characters",
  "conditions",
  "items",
  "locations",
  "events",
  "ambients",
  "endings",
  "achievements",
]);

export type ContentResource = z.infer<typeof contentResourceSchema>;

export type ContentRecord = Record<string, unknown>;
export type ContentModel = Model<ContentRecord>;

export interface ContentResourceConfig {
  entityType: string;
  model: ContentModel;
  schema: ZodType;
  contentFields: readonly string[];
  filterFields: readonly string[];
  referenceField: string;
  referenceArrayFields?: readonly string[];
}

export const contentResourceConfigs: Record<
  ContentResource,
  ContentResourceConfig
> = {
  characters: {
    entityType: "character",
    model: CharacterDefinitionModel as unknown as ContentModel,
    schema: characterDefinitionContentSchema,
    contentFields: [
      "name",
      "description",
      "avatarUrl",
      "baseStats",
      "baseLoadoutSlots",
      "traits",
    ],
    filterFields: [],
    referenceField: "characterKey",
  },
  conditions: {
    entityType: "condition",
    model: ConditionDefinitionModel as unknown as ContentModel,
    schema: conditionDefinitionContentSchema,
    contentFields: ["name", "description", "tone", "derivation"],
    filterFields: ["tone", "derivation.type"],
    referenceField: "condition",
    referenceArrayFields: ["removesConditionKeys"],
  },
  items: {
    entityType: "item",
    model: ItemDefinitionModel as unknown as ContentModel,
    schema: itemDefinitionContentSchema,
    contentFields: [
      "name",
      "description",
      "iconUrl",
      "category",
      "stackable",
      "maxStack",
      "canBreak",
      "hidden",
      "tags",
      "accountUnlockRule",
      "care",
    ],
    filterFields: ["category", "hidden"],
    referenceField: "itemKey",
  },
  locations: {
    entityType: "location",
    model: LocationDefinitionModel as unknown as ContentModel,
    schema: locationDefinitionContentSchema,
    contentFields: [
      "name",
      "description",
      "iconUrl",
      "mapPosition",
      "hidden",
      "dangerLevel",
      "travelDays",
      "tags",
      "discoveryRequirements",
      "eventPool",
    ],
    filterFields: ["dangerLevel", "hidden"],
    referenceField: "locationKey",
  },
  events: {
    entityType: "event",
    model: EventDefinitionModel as unknown as ContentModel,
    schema: eventDefinitionContentSchema,
    contentFields: [
      "name",
      "description",
      "imageUrl",
      "category",
      "delivery",
      "rarity",
      "weight",
      "hidden",
      "tags",
      "trigger",
      "requirements",
      "exclusionEventKeys",
      "mutexGroup",
      "interaction",
    ],
    filterFields: ["category", "delivery", "rarity", "hidden"],
    referenceField: "eventKey",
    referenceArrayFields: ["exclusionEventKeys"],
  },
  ambients: {
    entityType: "ambient",
    model: AmbientDefinitionModel as unknown as ContentModel,
    schema: ambientDefinitionContentSchema,
    contentFields: [
      "name",
      "timeLabel",
      "rarity",
      "weight",
      "hidden",
      "tags",
      "trigger",
      "requirements",
      "exclusionAmbientKeys",
      "mutexGroup",
      "resolution",
    ],
    filterFields: ["rarity", "hidden"],
    referenceField: "ambientKey",
    referenceArrayFields: ["exclusionAmbientKeys"],
  },
  endings: {
    entityType: "ending",
    model: EndingDefinitionModel as unknown as ContentModel,
    schema: endingDefinitionContentSchema,
    contentFields: [
      "name",
      "description",
      "imageUrl",
      "type",
      "priority",
      "hidden",
      "requirements",
    ],
    filterFields: ["type", "hidden"],
    referenceField: "endingKey",
  },
  achievements: {
    entityType: "achievement",
    model: AchievementDefinitionModel as unknown as ContentModel,
    schema: achievementDefinitionContentSchema,
    contentFields: [
      "name",
      "description",
      "iconUrl",
      "difficulty",
      "hidden",
      "progressType",
      "target",
      "requirements",
      "rewards",
    ],
    filterFields: ["difficulty", "progressType", "hidden"],
    referenceField: "achievementKey",
  },
};

export function getContentResourceConfig(
  resource: string,
): ContentResourceConfig {
  const parsed = contentResourceSchema.safeParse(resource);
  if (!parsed.success) {
    throw new Error("Unsupported content resource");
  }
  return contentResourceConfigs[parsed.data];
}

export function pickContent(
  record: ContentRecord,
  fields: readonly string[],
): ContentRecord {
  return Object.fromEntries(fields.map((field) => [field, record[field]]));
}
