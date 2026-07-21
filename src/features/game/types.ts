export type GameTab =
  | "daily"
  | "journey"
  | "event"
  | "characters"
  | "expedition"
  | "inventory";

export type CharacterState =
  | "shelter"
  | "expedition"
  | "missing"
  | "dead"
  | "insane";

export type CharacterStatKey =
  | "health"
  | "satiety"
  | "hydration"
  | "sanity";

export interface CharacterStats {
  health: number;
  satiety: number;
  hydration: number;
  sanity: number;
}

export interface CharacterCondition {
  label: string;
  tone: "neutral" | "warning" | "danger";
}

export interface GameCharacter {
  id: string;
  name: string;
  initials: string;
  role: string;
  baseLoadoutSlots: number;
  state: CharacterState;
  stats: CharacterStats;
  conditions: CharacterCondition[];
  expeditionDay?: number;
}

export type InventoryCategory =
  | "food"
  | "water"
  | "medical"
  | "tool"
  | "quest";

export type ItemCondition = "intact" | "broken";

export type ItemIconName =
  | "can"
  | "water"
  | "medicine"
  | "bandage"
  | "radio"
  | "flashlight"
  | "axe"
  | "map";

export interface InventoryItem {
  id: string;
  key: string;
  name: string;
  shortName: string;
  shortDescription: string;
  description: string;
  category: InventoryCategory;
  condition: ItemCondition;
  quantity: number;
  icon: ItemIconName;
  usable: boolean;
}

export interface DailyUpdate {
  id: string;
  kind: "outcome" | "return" | "ambient";
  label?: string;
  title: string;
  description: string;
  effects?: GameEffect[];
  actionLabel?: string;
  destination?: GameTab;
}

export interface GameEffect {
  label: string;
  tone: "positive" | "negative" | "warning" | "neutral";
}

export interface JourneyEntry {
  id: string;
  day: number;
  kind: "search" | "encounter" | "discovery" | "danger";
  title: string;
  location: string;
  description: string;
  effects: GameEffect[];
}

export interface ReturnJourneyReport {
  id: string;
  characterId: string;
  characterName: string;
  characterInitials: string;
  departedDay: number;
  returnedDay: number;
  durationDays: number;
  condition: string;
  summary: string;
  gains: GameEffect[];
  losses: GameEffect[];
  discoveries: GameEffect[];
  entries: JourneyEntry[];
}

export interface EventChoice {
  id: string;
  label: string;
  description?: string;
  available?: boolean;
  unavailableReason?: string;
  requiredItem?: {
    itemKey: string;
    quantity: number;
    usage: "consume" | "retain" | "risk";
  };
  result: {
    title: string;
    description: string;
    effects: GameEffect[];
  };
}

export interface CurrentEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  rarity: "common" | "uncommon" | "rare" | "ultra_rare";
  day: number;
  location: string;
  choices: EventChoice[];
}

export interface ExpeditionLoadoutItem {
  itemId: string;
  recommended?: boolean;
}
