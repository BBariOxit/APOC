import "server-only";

import { isValidObjectId } from "mongoose";

import { connectToDatabase } from "@/server/db/mongoose";
import { GameRuleDefinitionModel } from "@/server/db/models";

export interface GameRulesDTO {
  statRules: {
    criticalBelow: number;
  };
  dailyRules: {
    maxEventsPerDay: number;
    maxAmbientPerDay: number;
    ambientChance: number;
    foodUnitsPerCharacter: number;
    waterUnitsPerCharacter: number;
  };
  expeditionRules: {
    visibleLoadoutSlots: number;
    healthPerLostSlot: number;
    returnCooldownDays: number;
    maxDurationDays: number;
    maxJournalEntries: number;
  };
}
export async function getGameRules(
  contentVersionId: string,
): Promise<GameRulesDTO | null> {
  if (!isValidObjectId(contentVersionId)) {
    return null;
  }

  await connectToDatabase();

  const rules = await GameRuleDefinitionModel.findOne({ contentVersionId })
    .select({
      _id: 0,
      statRules: 1,
      dailyRules: 1,
      expeditionRules: 1,
    })
    .lean()
    .exec();

  if (!rules) {
    return null;
  }

  return {
    statRules: {
      criticalBelow: rules.statRules.criticalBelow,
    },
    dailyRules: {
      maxEventsPerDay: rules.dailyRules.maxEventsPerDay,
      maxAmbientPerDay: rules.dailyRules.maxAmbientPerDay,
      ambientChance: rules.dailyRules.ambientChance,
      foodUnitsPerCharacter: rules.dailyRules.foodUnitsPerCharacter,
      waterUnitsPerCharacter: rules.dailyRules.waterUnitsPerCharacter,
    },
    expeditionRules: {
      visibleLoadoutSlots: rules.expeditionRules.visibleLoadoutSlots,
      healthPerLostSlot: rules.expeditionRules.healthPerLostSlot,
      returnCooldownDays: rules.expeditionRules.returnCooldownDays,
      maxDurationDays: rules.expeditionRules.maxDurationDays,
      maxJournalEntries: rules.expeditionRules.maxJournalEntries,
    },
  };
}
