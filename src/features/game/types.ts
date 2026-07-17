export type GameTab =
  | "daily"
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
  description: string;
  category: InventoryCategory;
  condition: ItemCondition;
  quantity: number;
  icon: ItemIconName;
  usable: boolean;
}

export interface DailyUpdate {
  id: string;
  type: "warning" | "success" | "neutral";
  title: string;
  description: string;
  time: string;
}

export interface EventChoice {
  id: string;
  label: string;
  description: string;
  requiredItemKey?: string;
  requiredQuantity?: number;
  variant: "primary" | "secondary";
}

export interface CurrentEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  choices: EventChoice[];
}

export interface ExpeditionLoadoutItem {
  itemId: string;
  recommended?: boolean;
}
