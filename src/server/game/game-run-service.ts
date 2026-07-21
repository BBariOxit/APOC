import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { ClientSession } from "mongoose";

import type {
  GameRunDto,
  GameRunResultDto,
} from "@/features/game/api-types";
import {
  AchievementDefinitionModel,
  AmbientDefinitionModel,
  CharacterDefinitionModel,
  ConditionDefinitionModel,
  ContentVersionModel,
  EndingDefinitionModel,
  EventDefinitionModel,
  GameRuleDefinitionModel,
  GameRunModel,
  ItemDefinitionModel,
  PlayerProfileModel,
  RunEventLogModel,
  UserAchievementModel,
} from "@/server/db/models";
import { connectToDatabase } from "@/server/db/mongoose";
import {
  applyDailyNeeds,
  applyEffects,
  evaluateRule,
  generatePendingEvents,
  resolveEvent,
  type AppliedEffect,
  type EngineSignals,
  type EventDefinitionLike,
  type RuntimeState,
} from "@/server/game/engine";
import {
  advanceDayRequestSchema,
  careCharacterRequestSchema,
  createRunRequestSchema,
  resolveEventRequestSchema,
} from "@/server/game/schemas";
import { ApiError } from "@/server/http/api-error";
import type { RuleInput } from "@/server/validation/content";

const ENGINE_VERSION = "1.0.0";

// Mongoose returns heterogeneous lean documents at this DAL boundary. Every
// value is reduced to an explicit DTO before it can cross into the client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

interface ContentBundle {
  version: AnyRecord;
  rules: AnyRecord;
  characters: AnyRecord[];
  conditions: AnyRecord[];
  items: AnyRecord[];
  events: EventDefinitionLike[];
  ambients: AnyRecord[];
  endings: AnyRecord[];
  achievements: AnyRecord[];
}

function plain<T>(value: T): T {
  if (
    value &&
    typeof value === "object" &&
    "_bsontype" in value &&
    (value as { _bsontype?: string })._bsontype === "ObjectId"
  ) {
    return value;
  }
  if (value instanceof Map) {
    return Object.fromEntries(
      [...value.entries()].map(([key, entry]) => [key, plain(entry)]),
    ) as T;
  }
  if (Array.isArray(value)) return value.map(plain) as T;
  if (value instanceof Date) return value as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as AnyRecord).map(([key, entry]) => [key, plain(entry)]),
    ) as T;
  }
  return value;
}

function asRuntime(run: AnyRecord): RuntimeState {
  const value = plain(
    typeof run.toObject === "function"
      ? run.toObject({ flattenMaps: true, depopulate: true })
      : run,
  ) as AnyRecord;
  return {
    day: value.day,
    status: value.status,
    random: value.random,
    characters: value.characters,
    inventory: value.inventory,
    locations: value.locations,
    flags: value.flags ?? {},
    counters: value.counters ?? {},
    unlockedEventKeys: value.unlockedEventKeys ?? [],
    discoveredItemKeys: value.discoveredItemKeys ?? [],
    eventState: value.eventState,
    ambientState: value.ambientState,
    ending: value.ending,
  };
}

async function loadBundle(
  contentVersionId?: string,
  session?: ClientSession,
): Promise<ContentBundle> {
  const versionQuery = contentVersionId
    ? ContentVersionModel.findById(contentVersionId)
    : ContentVersionModel.findOne({ status: "published" }).sort({ publishedAt: -1 });
  const version = await versionQuery.session(session ?? null).lean().exec();
  if (!version || (!contentVersionId && version.status !== "published")) {
    throw new ApiError(
      409,
      "NO_PUBLISHED_CONTENT",
      "Chưa có content version được publish để bắt đầu ván.",
    );
  }

  const query = { contentVersionId: version._id, enabled: true };
  const [rules, characters, conditions, items, events, ambients, endings, achievements] =
    await Promise.all([
      GameRuleDefinitionModel.findOne({ contentVersionId: version._id }).session(session ?? null).lean().exec(),
      CharacterDefinitionModel.find(query).session(session ?? null).lean().exec(),
      ConditionDefinitionModel.find(query).session(session ?? null).lean().exec(),
      ItemDefinitionModel.find(query).session(session ?? null).lean().exec(),
      EventDefinitionModel.find(query).session(session ?? null).lean().exec(),
      AmbientDefinitionModel.find(query).session(session ?? null).lean().exec(),
      EndingDefinitionModel.find(query).session(session ?? null).lean().exec(),
      AchievementDefinitionModel.find(query).session(session ?? null).lean().exec(),
    ]);
  if (!rules) throw new ApiError(409, "CONTENT_INVALID", "Published content is missing game rules");

  return {
    version: plain(version) as AnyRecord,
    rules: plain(rules) as AnyRecord,
    characters: plain(characters) as AnyRecord[],
    conditions: plain(conditions) as AnyRecord[],
    items: plain(items) as AnyRecord[],
    events: plain(events) as unknown as EventDefinitionLike[],
    ambients: plain(ambients) as AnyRecord[],
    endings: plain(endings) as AnyRecord[],
    achievements: plain(achievements) as AnyRecord[],
  };
}

function eventChoices(
  event: EventDefinitionLike,
  state: RuntimeState,
  items: Map<string, AnyRecord>,
) {
  if (event.interaction.mode === "choices") {
    const normalAvailable = event.interaction.choices.filter(
      (choice) => !choice.fallbackOnly && evaluateRule(choice.requirements, state),
    );
    return event.interaction.choices.map((choice) => {
      const available = choice.fallbackOnly
        ? normalAvailable.length === 0
        : evaluateRule(choice.requirements, state);
      return {
        key: choice.key,
        label: choice.label,
        description: choice.description,
        available,
        ...(available ? {} : { unavailableReason: "Điều kiện chưa đạt" }),
      };
    });
  }
  if (event.interaction.mode === "item_selection") {
    const branches = event.interaction.itemBranches.map((branch) => {
      const entry = state.inventory.find(({ itemKey }) => itemKey === branch.itemKey);
      const quantity = branch.condition === "broken"
        ? entry?.brokenQuantity ?? 0
        : branch.condition === "intact"
          ? entry?.intactQuantity ?? 0
          : (entry?.intactQuantity ?? 0) + (entry?.brokenQuantity ?? 0);
      const available = quantity >= branch.quantity && evaluateRule(branch.requirements, state);
      return {
        key: `item:${branch.key}`,
        label: `Dùng ${items.get(branch.itemKey)?.name ?? branch.itemKey}`,
        description: `Cần ${branch.quantity} · đang có ${quantity}`,
        available,
        ...(available ? {} : { unavailableReason: "Không đủ vật phẩm hoặc điều kiện" }),
      };
    });
    const hasAvailable = branches.some(({ available }) => available);
    const fallbackAvailable =
      event.interaction.noItemBranch.availability === "always" || !hasAvailable;
    return [
      ...branches,
      {
        key: "fallback",
        label: event.interaction.noItemBranch.label,
        description: event.interaction.noItemBranch.description,
        available: fallbackAvailable,
        ...(fallbackAvailable ? {} : { unavailableReason: "Hãy dùng một vật phẩm phù hợp" }),
      },
    ];
  }
  return [];
}

function toDto(
  run: AnyRecord,
  bundle: ContentBundle,
  lastResult?: GameRunResultDto,
): GameRunDto {
  const value = plain(
    typeof run.toObject === "function"
      ? run.toObject({ flattenMaps: true, depopulate: true })
      : run,
  ) as AnyRecord;
  const state = asRuntime(value);
  const characterByKey = new Map(bundle.characters.map((entry) => [entry.key, entry]));
  const itemByKey = new Map(bundle.items.map((entry) => [entry.key, entry]));
  const conditionByKey = new Map(bundle.conditions.map((entry) => [entry.key, entry]));
  const eventByKey = new Map(bundle.events.map((entry) => [entry.key, entry]));
  const endingByKey = new Map(bundle.endings.map((entry) => [entry.key, entry]));

  return {
    id: String(value._id),
    contentVersion: String(bundle.version.version),
    status: value.status,
    day: value.day,
    revision: value.revision,
    characters: state.characters.map((character) => {
      const definition = characterByKey.get(character.characterKey);
      const nextExpeditionDay =
        typeof character.nextExpeditionDay === "number"
          ? character.nextExpeditionDay
          : undefined;
      return {
        key: character.characterKey,
        name: definition?.name ?? character.characterKey,
        description: definition?.description ?? "",
        avatarUrl: definition?.avatarUrl ?? "",
        baseLoadoutSlots: definition?.baseLoadoutSlots ?? 1,
        state: character.state,
        stats: character.stats,
        conditions: [
          ...character.conditions.map((condition) => {
            const conditionDefinition = conditionByKey.get(condition.type);
            return {
              key: condition.type,
              label: conditionDefinition?.name ?? condition.type.replaceAll("_", " "),
              tone: conditionDefinition?.tone ?? (condition.severity && condition.severity >= 2 ? "danger" : "warning"),
              remainingDays: condition.remainingDays,
            };
          }),
          ...bundle.conditions
            .filter((entry) => entry.derivation?.type === "stat_below" && character.stats[entry.derivation.stat as keyof typeof character.stats] < entry.derivation.threshold)
            .filter((entry, _index, entries) => !entries.some((candidate) => candidate.derivation.stat === entry.derivation.stat && candidate.derivation.threshold < entry.derivation.threshold))
            .map((entry) => ({ key: entry.key, label: entry.name, tone: entry.tone })),
          ...bundle.conditions
            .filter((entry) => entry.derivation?.type === "expedition_cooldown" && nextExpeditionDay !== undefined && nextExpeditionDay > state.day)
            .map((entry) => ({ key: entry.key, label: entry.name, tone: entry.tone, remainingDays: (nextExpeditionDay ?? state.day) - state.day })),
        ],
      };
    }),
    inventory: state.inventory.flatMap((entry) => {
      const definition = itemByKey.get(entry.itemKey);
      if (!definition) return [];
      return [{
        key: entry.itemKey,
        name: definition.name,
        description: definition.description,
        iconUrl: definition.iconUrl,
        category: definition.category,
        canBreak: definition.canBreak,
        careAction: definition.care?.action,
        intactQuantity: entry.intactQuantity,
        brokenQuantity: entry.brokenQuantity,
      }];
    }),
    pendingEvents: state.eventState.pendingEvents.flatMap((pending) => {
      const definition = eventByKey.get(pending.eventKey);
      if (!definition) return [];
      return [{
        instanceId: pending.instanceId,
        key: definition.key,
        name: definition.name,
        description: definition.description,
        imageUrl: definition.imageUrl,
        category: definition.category,
        rarity: definition.rarity,
        generatedDay: pending.generatedDay,
        choices: eventChoices(definition, state, itemByKey),
      }];
    }),
    ...(state.ending
      ? {
          ending: {
            key: state.ending.endingKey,
            name: endingByKey.get(state.ending.endingKey)?.name ?? state.ending.endingKey,
            description: endingByKey.get(state.ending.endingKey)?.description ?? "",
          },
        }
      : {}),
    ...(lastResult ? { lastResult } : {}),
    updatedAt: new Date(value.updatedAt ?? value.lastPlayedAt).toISOString(),
  };
}

function applyRuntime(run: AnyRecord, state: RuntimeState, nextRevision: number) {
  run.set({
    status: state.status,
    day: state.day,
    revision: nextRevision,
    random: state.random,
    characters: state.characters,
    inventory: state.inventory,
    locations: state.locations,
    flags: state.flags,
    counters: state.counters,
    unlockedEventKeys: state.unlockedEventKeys,
    discoveredItemKeys: state.discoveredItemKeys,
    eventState: state.eventState,
    ambientState: state.ambientState,
    ending: state.ending,
    lastPlayedAt: new Date(),
    ...(state.status === "completed" ? { completedAt: new Date() } : {}),
  });
}

function stateHash(state: RuntimeState): string {
  return createHash("sha256").update(JSON.stringify(plain(state))).digest("hex");
}

async function applySignals(
  userId: string,
  runId: string,
  signals: EngineSignals,
  session: ClientSession,
) {
  if (signals.unlockEventKeys.length || signals.unlockItemKeys.length) {
    await PlayerProfileModel.updateOne(
      { userId },
      {
        $addToSet: {
          unlockedEventKeys: { $each: signals.unlockEventKeys },
          unlockedItemKeys: { $each: signals.unlockItemKeys },
        },
      },
      { session },
    ).exec();
  }
  for (const achievementKey of new Set(signals.achievementKeys)) {
    await UserAchievementModel.updateOne(
      { userId, achievementKey },
      {
        $set: { progress: 1, completed: true, unlockedAt: new Date(), sourceRunId: runId },
      },
      { upsert: true, session },
    ).exec();
  }
}

async function evaluateMetaContent(
  userId: string,
  runId: string,
  state: RuntimeState,
  bundle: ContentBundle,
  session: ClientSession,
): Promise<{ effects: AppliedEffect[]; signals: EngineSignals }> {
  const unlocked = await UserAchievementModel.find({ userId, completed: true })
    .session(session)
    .select("achievementKey")
    .lean()
    .exec();
  const unlockedKeys = new Set(unlocked.map(({ achievementKey }) => achievementKey));
  const combinedSignals: EngineSignals = {
    unlockEventKeys: [], unlockItemKeys: [], achievementKeys: [], forceExpeditionReturnReasons: [],
  };
  const effects: AppliedEffect[] = [];
  for (const achievement of bundle.achievements.sort((left, right) => left.key.localeCompare(right.key))) {
    if (unlockedKeys.has(achievement.key) || !evaluateRule(achievement.requirements as RuleInput, state, { unlockedAchievementKeys: unlockedKeys })) continue;
    const result = applyEffects(achievement.rewards ?? [], state, `achievement:${achievement.key}`, { unlockedAchievementKeys: unlockedKeys });
    unlockedKeys.add(achievement.key);
    combinedSignals.achievementKeys.push(achievement.key, ...result.signals.achievementKeys);
    combinedSignals.unlockEventKeys.push(...result.signals.unlockEventKeys);
    combinedSignals.unlockItemKeys.push(...result.signals.unlockItemKeys);
    combinedSignals.forceExpeditionReturnReasons.push(...result.signals.forceExpeditionReturnReasons);
    effects.push(...result.appliedEffects);
  }
  if (!state.ending) {
    const ending = [...bundle.endings]
      .filter(
        (entry) =>
          entry.requirements &&
          evaluateRule(entry.requirements as RuleInput, state, {
            unlockedAchievementKeys: unlockedKeys,
          }),
      )
      .sort((left, right) => right.priority - left.priority || left.key.localeCompare(right.key))[0];
    if (ending) {
      state.ending = { endingKey: ending.key, triggeredAtDay: state.day };
      state.status = "completed";
      effects.push({ type: "trigger_ending", target: ending.key, after: state.day });
    }
  }
  await applySignals(userId, runId, combinedSignals, session);
  return { effects, signals: combinedSignals };
}

export async function getActiveGameRun(userId: string): Promise<GameRunDto | null> {
  await connectToDatabase();
  const run = await GameRunModel.findOne({ userId, status: "active" }).lean().exec();
  if (!run) return null;
  return toDto(run, await loadBundle(String(run.contentVersionId)));
}

export async function getGameRun(userId: string, runId: string): Promise<GameRunDto> {
  await connectToDatabase();
  const run = await GameRunModel.findOne({ _id: runId, userId }).lean().exec();
  if (!run) throw new ApiError(404, "RUN_NOT_FOUND", "Game run not found");
  return toDto(run, await loadBundle(String(run.contentVersionId)));
}

export async function createGameRun(userId: string, input: unknown): Promise<GameRunDto> {
  createRunRequestSchema.parse(input);
  const mongoose = await connectToDatabase();
  const session = await mongoose.startSession();
  let result: GameRunDto | undefined;
  try {
    await session.withTransaction(async () => {
      const existing = await GameRunModel.findOne({ userId, status: "active" }).session(session).exec();
      if (existing) throw new ApiError(409, "ACTIVE_RUN_EXISTS", "Bạn đã có một ván đang chơi.");
      const bundle = await loadBundle(undefined, session);
      const setup = bundle.rules.runSetup as { characterKeys: string[]; inventory: AnyRecord[] };
      if (!setup || setup.characterKeys.length !== 4) throw new ApiError(409, "CONTENT_INVALID", "Published run setup must contain four characters");
      const characterByKey = new Map(bundle.characters.map((entry) => [entry.key, entry]));
      const state: RuntimeState = {
        day: 1,
        status: "active",
        random: { seed: randomBytes(32).toString("hex"), cursor: 0 },
        characters: setup.characterKeys.map((characterKey) => {
          const definition = characterByKey.get(characterKey);
          if (!definition) throw new ApiError(409, "CONTENT_INVALID", `Starting character ${characterKey} is unavailable`);
          return { characterKey, stats: definition.baseStats, state: "shelter" as const, conditions: [] };
        }),
        inventory: setup.inventory.map((entry) => ({ itemKey: entry.itemKey, intactQuantity: entry.intactQuantity, brokenQuantity: entry.brokenQuantity })),
        locations: [], flags: {}, counters: {}, unlockedEventKeys: [], discoveredItemKeys: setup.inventory.map((entry) => entry.itemKey),
        eventState: { occurredCounts: {}, lastOccurredDay: {}, choiceCounts: {}, completedEventKeys: [], blockedEventKeys: [], queuedEvents: [], pendingEvents: [] },
        ambientState: { occurredCounts: {}, lastOccurredDay: {}, blockedAmbientKeys: [], queuedAmbient: [] },
      };
      generatePendingEvents(state, bundle.events, bundle.rules.dailyRules.maxEventsPerDay, randomUUID);
      const [run] = await GameRunModel.create([{ userId, contentVersionId: bundle.version._id, engineVersion: ENGINE_VERSION, mode: "normal", ...state }], { session });
      await PlayerProfileModel.updateOne(
        { userId },
        {
          $set: { activeRunId: run._id },
          $setOnInsert: { unlockedItemKeys: [], unlockedEventKeys: [], discoveredItemKeys: [], discoveredEventKeys: [], discoveredLocationKeys: [], discoveredEndingKeys: [] },
          $inc: { "statistics.totalRuns": 1 },
        },
        { upsert: true, session },
      ).exec();
      result = toDto(run, bundle);
    });
  } finally {
    await session.endSession();
  }
  if (!result) throw new Error("run transaction completed without a result");
  return result;
}

async function idempotentResult(
  userId: string,
  runId: string,
  commandId: string,
): Promise<GameRunDto | null> {
  const log = await RunEventLogModel.findOne({ runId, userId, commandId }).lean().exec();
  if (!log) return null;
  const run = await GameRunModel.findOne({ _id: runId, userId }).lean().exec();
  if (!run) throw new ApiError(404, "RUN_NOT_FOUND", "Game run not found");
  const lastResult = log.resultTitle && log.resultDescription
    ? { title: log.resultTitle, description: log.resultDescription, effects: log.appliedEffects.map((effect) => effect.target ? `${effect.type}: ${effect.target}` : effect.type) }
    : undefined;
  return toDto(run, await loadBundle(String(run.contentVersionId)), lastResult);
}

export async function advanceGameDay(userId: string, runId: string, input: unknown): Promise<GameRunDto> {
  const command = advanceDayRequestSchema.parse(input);
  await connectToDatabase();
  const repeated = await idempotentResult(userId, runId, command.commandId);
  if (repeated) return repeated;
  const mongoose = await connectToDatabase();
  const session = await mongoose.startSession();
  let result: GameRunDto | undefined;
  try {
    await session.withTransaction(async () => {
      const run = await GameRunModel.findOne({ _id: runId, userId, status: "active" }).session(session).exec();
      if (!run) throw new ApiError(404, "RUN_NOT_FOUND", "Active game run not found");
      if (run.revision !== command.expectedRevision) throw new ApiError(409, "EDIT_CONFLICT", "Game state changed; reload before retrying");
      const state = asRuntime(run);
      if (state.eventState.pendingEvents.length) throw new ApiError(409, "PENDING_EVENTS", "Resolve all pending events before advancing the day");
      const bundle = await loadBundle(String(run.contentVersionId), session);
      state.day += 1;
      for (const character of state.characters) {
        character.conditions = character.conditions.flatMap((condition) => {
          if (condition.remainingDays === undefined) return [condition];
          const remainingDays = condition.remainingDays - 1;
          return remainingDays > 0 ? [{ ...condition, remainingDays }] : [];
        });
      }
      const categories = new Map(bundle.items.map((item) => [item.key, item.category]));
      const dailyEffects = applyDailyNeeds(state, categories, bundle.rules.dailyRules);
      const randomRolls = generatePendingEvents(state, bundle.events, bundle.rules.dailyRules.maxEventsPerDay, randomUUID);
      const meta = await evaluateMetaContent(userId, runId, state, bundle, session);
      const nextRevision = command.expectedRevision + 1;
      applyRuntime(run, state, nextRevision);
      await run.save({ session });
      await RunEventLogModel.create([{
        runId: run._id, userId, contentVersionId: run.contentVersionId, engineVersion: ENGINE_VERSION,
        commandId: command.commandId, sequence: nextRevision, day: state.day, action: "advance_day",
        randomRolls, appliedEffects: [...dailyEffects, ...meta.effects], stateHash: stateHash(state),
      }], { session });
      if (state.status === "completed") {
        await PlayerProfileModel.updateOne({ userId }, { $unset: { activeRunId: 1 }, $inc: { "statistics.completedRuns": 1 } }, { session }).exec();
      }
      result = toDto(run, bundle);
    });
  } finally { await session.endSession(); }
  if (!result) throw new Error("advance transaction completed without a result");
  return result;
}

export async function careForGameCharacter(
  userId: string,
  runId: string,
  input: unknown,
): Promise<GameRunDto> {
  const command = careCharacterRequestSchema.parse(input);
  await connectToDatabase();
  const repeated = await idempotentResult(userId, runId, command.commandId);
  if (repeated) return repeated;
  const mongoose = await connectToDatabase();
  const session = await mongoose.startSession();
  let result: GameRunDto | undefined;
  try {
    await session.withTransaction(async () => {
      const run = await GameRunModel.findOne({ _id: runId, userId, status: "active" }).session(session).exec();
      if (!run) throw new ApiError(404, "RUN_NOT_FOUND", "Active game run not found");
      if (run.revision !== command.expectedRevision) throw new ApiError(409, "EDIT_CONFLICT", "Game state changed; reload before retrying");
      const state = asRuntime(run);
      const character = state.characters.find(({ characterKey }) => characterKey === command.characterKey);
      if (!character || character.state !== "shelter") throw new ApiError(422, "CHARACTER_UNAVAILABLE", "Nhân vật hiện không thể nhận chăm sóc.");
      const bundle = await loadBundle(String(run.contentVersionId), session);
      const item = bundle.items.find(({ key }) => key === command.itemKey);
      if (!item?.care || item.care.action !== command.action) {
        throw new ApiError(422, "ITEM_NOT_USABLE", "Vật phẩm không phù hợp với hành động này.");
      }
      const inventory = state.inventory.find(({ itemKey }) => itemKey === command.itemKey);
      if (!inventory || inventory.intactQuantity < 1) throw new ApiError(422, "ITEM_UNAVAILABLE", "Vật phẩm đã hết hoặc bị hỏng.");
      const changesAStat = Object.entries(item.care.statChanges ?? {}).some(
        ([stat, amount]) =>
          Number(amount) > 0 &&
          character.stats[stat as keyof typeof character.stats] < 100,
      );
      const removesACondition = (item.care.removesConditionKeys ?? []).some(
        (conditionKey: string) => character.conditions.some(({ type }) => type === conditionKey),
      );
      if (!changesAStat && !removesACondition) {
        throw new ApiError(422, "CARE_NOT_NEEDED", "Nhân vật chưa cần dùng vật phẩm này.");
      }

      const target = { mode: "character", characterKey: command.characterKey };
      const effects = [
        { type: "remove_item", target: { scope: "shelter" }, itemKey: command.itemKey, condition: "intact", quantity: 1 },
        ...Object.entries(item.care.statChanges ?? {}).map(([stat, amount]) => ({ type: "modify_character_stat", target, stat, amount })),
        ...(item.care.removesConditionKeys ?? []).map((condition: string) => ({ type: "remove_condition", target, condition })),
      ];
      const applied = applyEffects(effects, state, `care:${command.action}`);
      const meta = await evaluateMetaContent(userId, runId, state, bundle, session);
      const nextRevision = command.expectedRevision + 1;
      applyRuntime(run, state, nextRevision);
      await run.save({ session });
      const actionLabels = { feed: "cho ăn", hydrate: "cho uống", heal: "chữa trị" } as const;
      const title = `Đã ${actionLabels[command.action]} cho ${bundle.characters.find(({ key }) => key === command.characterKey)?.name ?? command.characterKey}`;
      const description = `Đã dùng 1 ${item.name}.`;
      const appliedEffects = [...applied.appliedEffects, ...meta.effects];
      await RunEventLogModel.create([{
        runId: run._id, userId, contentVersionId: run.contentVersionId, engineVersion: ENGINE_VERSION,
        commandId: command.commandId, sequence: nextRevision, day: state.day, action: "care",
        characterKey: command.characterKey, careAction: command.action, selectedItemKey: command.itemKey,
        resultTitle: title, resultDescription: description,
        randomRolls: [], appliedEffects, stateHash: stateHash(state),
      }], { session });
      result = toDto(run, bundle, {
        title,
        description,
        effects: appliedEffects.map((effect) => effect.target ? `${effect.type}: ${effect.target}` : effect.type),
      });
    });
  } finally {
    await session.endSession();
  }
  if (!result) throw new Error("care transaction completed without a result");
  return result;
}

export async function resolveGameEvent(
  userId: string,
  runId: string,
  instanceId: string,
  input: unknown,
): Promise<GameRunDto> {
  const command = resolveEventRequestSchema.parse(input);
  await connectToDatabase();
  const repeated = await idempotentResult(userId, runId, command.commandId);
  if (repeated) return repeated;
  const mongoose = await connectToDatabase();
  const session = await mongoose.startSession();
  let result: GameRunDto | undefined;
  try {
    await session.withTransaction(async () => {
      const run = await GameRunModel.findOne({ _id: runId, userId, status: "active" }).session(session).exec();
      if (!run) throw new ApiError(404, "RUN_NOT_FOUND", "Active game run not found");
      if (run.revision !== command.expectedRevision) throw new ApiError(409, "EDIT_CONFLICT", "Game state changed; reload before retrying");
      const state = asRuntime(run);
      const pending = state.eventState.pendingEvents.find((event) => event.instanceId === instanceId);
      if (!pending) throw new ApiError(404, "EVENT_NOT_FOUND", "Pending event not found");
      const bundle = await loadBundle(String(run.contentVersionId), session);
      const definition = bundle.events.find((event) => event.key === pending.eventKey);
      if (!definition) throw new ApiError(409, "CONTENT_INVALID", "Event definition is unavailable");
      let resolution;
      try {
        resolution = resolveEvent(state, definition, instanceId, {
          ...(command.intentKey === "fallback" ? { useFallback: true } : {}),
          ...(command.intentKey.startsWith("item:") ? { itemBranchKey: command.intentKey.slice(5) } : {}),
          ...(!command.intentKey.startsWith("item:") && command.intentKey !== "fallback" ? { choiceKey: command.intentKey } : {}),
        });
      } catch (error) {
        throw new ApiError(422, "INVALID_EVENT_INTENT", error instanceof Error ? error.message : "Invalid event intent");
      }
      await applySignals(userId, runId, resolution.signals, session);
      const meta = await evaluateMetaContent(userId, runId, state, bundle, session);
      const nextRevision = command.expectedRevision + 1;
      applyRuntime(run, state, nextRevision);
      await run.save({ session });
      const appliedEffects = [...resolution.appliedEffects, ...meta.effects];
      await RunEventLogModel.create([{
        runId: run._id, userId, contentVersionId: run.contentVersionId, engineVersion: ENGINE_VERSION,
        commandId: command.commandId, sequence: nextRevision, day: state.day, action: "event_choice",
        eventInstanceId: instanceId, eventKey: definition.key,
        choiceKey: resolution.choiceKey, selectedItemKey: resolution.selectedItemKey,
        itemBranchKey: resolution.itemBranchKey, fallbackUsed: resolution.fallbackUsed,
        resolutionMode: resolution.resolutionMode, resultKey: resolution.resultKey,
        resultTitle: resolution.title, resultDescription: resolution.description,
        randomRolls: resolution.randomRolls, appliedEffects, stateHash: stateHash(state),
      }], { session });
      if (state.status === "completed") {
        await PlayerProfileModel.updateOne({ userId }, { $unset: { activeRunId: 1 }, $inc: { "statistics.completedRuns": 1 } }, { session }).exec();
      }
      result = toDto(run, bundle, { title: resolution.title, description: resolution.description, effects: resolution.effectLabels });
    });
  } finally { await session.endSession(); }
  if (!result) throw new Error("event transaction completed without a result");
  return result;
}
