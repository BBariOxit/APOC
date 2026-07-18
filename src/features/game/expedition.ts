import type { GameCharacter } from "@/features/game/types";

const HEALTH_PER_LOST_LOADOUT_SLOT = 25;

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
  loadoutItemIds: string[],
  slotIndex: number,
  itemId: string,
) {
  if (slotIndex >= loadoutItemIds.length) {
    return [...loadoutItemIds, itemId];
  }

  const nextLoadoutItemIds = [...loadoutItemIds];
  nextLoadoutItemIds[slotIndex] = itemId;

  return nextLoadoutItemIds;
}

export function removeLoadoutSlot(
  loadoutItemIds: string[],
  slotIndex: number,
) {
  return loadoutItemIds.filter((_, index) => index !== slotIndex);
}
