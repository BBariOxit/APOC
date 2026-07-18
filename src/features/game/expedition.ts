import type { GameCharacter } from "@/features/game/types";

const HEALTH_PER_LOST_LOADOUT_SLOT = 25;
export const MAX_LOADOUT_SLOTS = 4;

export function getLostLoadoutSlots(health: number) {
  const safeHealth = Math.min(100, Math.max(0, health));

  return Math.floor((100 - safeHealth) / HEALTH_PER_LOST_LOADOUT_SLOT);
}

export function getLoadoutSlotCapacity(character: GameCharacter) {
  return Math.max(
    0,
    character.baseLoadoutSlots - getLostLoadoutSlots(character.stats.health),
  );
}

export function setLoadoutSlot(
  loadoutItemIds: Array<string | null>,
  slotIndex: number,
  itemId: string,
) {
  const nextLoadoutItemIds = [...loadoutItemIds];
  nextLoadoutItemIds[slotIndex] = itemId;

  return nextLoadoutItemIds;
}

export function removeLoadoutSlot(
  loadoutItemIds: Array<string | null>,
  slotIndex: number,
) {
  return loadoutItemIds.map((itemId, index) =>
    index === slotIndex ? null : itemId,
  );
}
