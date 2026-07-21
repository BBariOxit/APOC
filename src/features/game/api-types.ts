export interface GameRunCharacterDto {
  key: string;
  name: string;
  description: string;
  avatarUrl: string;
  baseLoadoutSlots: number;
  state: "shelter" | "expedition" | "missing" | "dead" | "insane";
  stats: {
    health: number;
    satiety: number;
    hydration: number;
    sanity: number;
  };
  conditions: Array<{
    key: string;
    label: string;
    tone: "neutral" | "warning" | "danger";
    severity?: number;
    remainingDays?: number;
  }>;
}

export interface GameRunInventoryDto {
  key: string;
  name: string;
  description: string;
  iconUrl: string;
  category: "food" | "water" | "tool" | "medical" | "weapon" | "quest";
  canBreak: boolean;
  careAction?: "feed" | "hydrate" | "heal";
  intactQuantity: number;
  brokenQuantity: number;
}

export interface GameRunChoiceDto {
  key: string;
  label: string;
  description?: string;
  available: boolean;
  unavailableReason?: string;
}

export interface GameRunEventDto {
  instanceId: string;
  key: string;
  name: string;
  description: string;
  imageUrl?: string;
  category: string;
  rarity: "common" | "uncommon" | "rare" | "ultra_rare";
  generatedDay: number;
  choices: GameRunChoiceDto[];
}

export interface GameRunResultDto {
  title: string;
  description: string;
  effects: string[];
}

export interface GameRunDto {
  id: string;
  contentVersion: string;
  status: "active" | "completed" | "abandoned";
  day: number;
  revision: number;
  characters: GameRunCharacterDto[];
  inventory: GameRunInventoryDto[];
  pendingEvents: GameRunEventDto[];
  ending?: { key: string; name: string; description: string };
  lastResult?: GameRunResultDto;
  updatedAt: string;
}

export interface GameApiEnvelope<T> {
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}
