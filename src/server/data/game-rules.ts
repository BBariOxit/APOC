import "server-only";

import { isValidObjectId } from "mongoose";

import { connectToDatabase } from "@/server/db/mongoose";
import { GameRuleDefinitionModel } from "@/server/db/models";

export interface GameRulesDTO {
  statRules: {
    min: number;
    max: number;
    criticalBelow: number;
  };
  dailyRules: {
    maxEventsPerDay: number;
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
      min: rules.statRules.min,
      max: rules.statRules.max,
      criticalBelow: rules.statRules.criticalBelow,
    },
    dailyRules: {
      maxEventsPerDay: rules.dailyRules.maxEventsPerDay,
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
