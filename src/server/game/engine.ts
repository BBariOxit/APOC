import seedrandom from "seedrandom";

import type { RuleInput } from "@/server/validation/content";

export interface RuntimeCharacter {
  characterKey: string;
  stats: Record<"health" | "satiety" | "hydration" | "sanity", number>;
  state: "shelter" | "expedition" | "missing" | "dead" | "insane";
  conditions: Array<{
    type: string;
    severity?: number;
    remainingDays?: number;
    sourceEventKey?: string;
  }>;
  [key: string]: unknown;
}

export interface RuntimeInventoryEntry {
  itemKey: string;
  intactQuantity: number;
  brokenQuantity: number;
}

export interface RuntimeState {
  day: number;
  status: "active" | "completed" | "abandoned";
  random: { seed: string; cursor: number };
  characters: RuntimeCharacter[];
  inventory: RuntimeInventoryEntry[];
  locations: Array<{
    locationKey: string;
    status: "rumored" | "discovered" | "visited" | "depleted";
    discoveredDay: number;
    visitedCount: number;
    depletedUntilDay?: number;
    [key: string]: unknown;
  }>;
  flags: Record<string, boolean | number | string>;
  counters: Record<string, number>;
  unlockedEventKeys: string[];
  discoveredItemKeys: string[];
  eventState: {
    occurredCounts: Record<string, number>;
    lastOccurredDay: Record<string, number>;
    choiceCounts: Record<string, number>;
    completedEventKeys: string[];
    blockedEventKeys: string[];
    queuedEvents: Array<{
      eventKey: string;
      scheduledDay: number;
      sourceEventKey?: string;
    }>;
    pendingEvents: Array<{
      instanceId: string;
      eventKey: string;
      generatedDay: number;
      sequence: number;
    }>;
  };
  ambientState: {
    queuedAmbient: Array<{
      ambientKey: string;
      scheduledDay: number;
      sourceEventKey?: string;
    }>;
    [key: string]: unknown;
  };
  ending?: { endingKey: string; triggeredAtDay: number };
}

export interface RuleContext {
  carriedInventory?: RuntimeInventoryEntry[];
  currentLocationKey?: string;
  expeditionDay?: number;
  expeditionCharacterKey?: string;
  unlockedAchievementKeys?: ReadonlySet<string>;
}

export interface RandomRoll {
  purpose: string;
  value: number;
  result: string;
}

export interface AppliedEffect {
  type: string;
  target?: string;
  before?: unknown;
  after?: unknown;
}

export interface EngineSignals {
  unlockEventKeys: string[];
  unlockItemKeys: string[];
  achievementKeys: string[];
  forceExpeditionReturnReasons: string[];
}

export interface EffectLike {
  type: string;
  [key: string]: unknown;
}

export interface ResolutionLike {
  mode: "deterministic" | "weighted";
  title?: string;
  description?: string;
  effects?: EffectLike[];
  outcomes?: Array<{
    key: string;
    weight: number;
    title: string;
    description: string;
    requirements?: RuleInput;
    effects: EffectLike[];
  }>;
}

export interface EventDefinitionLike {
  key: string;
  name: string;
  description: string;
  imageUrl?: string;
  category: string;
  delivery: "pending" | "expedition";
  rarity: "common" | "uncommon" | "rare" | "ultra_rare";
  weight: number;
  enabled: boolean;
  trigger: {
    mode: "random" | "fixed_day" | "scheduled" | "chained" | "location_pool" | "manual";
    fixedDay?: number;
    minDay?: number;
    maxDay?: number;
    maxOccurrences?: number;
    cooldownDays?: number;
  };
  requirements?: RuleInput;
  exclusionEventKeys: string[];
  mutexGroup?: string;
  interaction:
    | {
        mode: "choices";
        choices: Array<{
          key: string;
          label: string;
          description?: string;
          requirements?: RuleInput;
          fallbackOnly?: boolean;
          resolution: ResolutionLike;
        }>;
      }
    | {
        mode: "item_selection";
        source: "player" | "carried_inventory";
        itemBranches: Array<{
          key: string;
          itemKey: string;
          condition?: "intact" | "broken";
          quantity: number;
          priority?: number;
          requirements?: RuleInput;
          resolution: ResolutionLike;
        }>;
        noItemBranch: {
          label: string;
          description?: string;
          availability: "fallback_only" | "always";
          resolution: ResolutionLike;
        };
      }
    | { mode: "scripted"; resolution: ResolutionLike };
}

export function evaluateRule(
  rule: RuleInput | undefined,
  state: RuntimeState,
  context: RuleContext = {},
): boolean {
  if (!rule) return true;
  if ("all" in rule) return rule.all.every((item) => evaluateRule(item, state, context));
  if ("any" in rule) return rule.any.some((item) => evaluateRule(item, state, context));
  if ("not" in rule) return !evaluateRule(rule.not, state, context);

  switch (rule.type) {
    case "day_gte": return state.day >= rule.value;
    case "day_lte": return state.day <= rule.value;
    case "has_item": {
      const inventory = rule.scope === "carried_inventory"
        ? context.carriedInventory ?? []
        : state.inventory;
      const item = inventory.find(({ itemKey }) => itemKey === rule.itemKey);
      const quantity = rule.condition === "broken"
        ? item?.brokenQuantity ?? 0
        : rule.condition === "intact"
          ? item?.intactQuantity ?? 0
          : (item?.intactQuantity ?? 0) + (item?.brokenQuantity ?? 0);
      return quantity >= rule.quantity;
    }
    case "flag_equals": return state.flags[rule.key] === rule.value;
    case "counter_gte": return (state.counters[rule.key] ?? 0) >= rule.value;
    case "event_completed": return state.eventState.completedEventKeys.includes(rule.eventKey);
    case "event_choice_made": return (state.eventState.choiceCounts[`${rule.eventKey}:${rule.choiceKey}`] ?? 0) > 0;
    case "achievement_unlocked": return context.unlockedAchievementKeys?.has(rule.achievementKey) ?? false;
    case "location_discovered": return state.locations.some(({ locationKey, status }) => locationKey === rule.locationKey && status !== "rumored");
    case "location_visited": return state.locations.some(({ locationKey, visitedCount }) => locationKey === rule.locationKey && visitedCount >= (rule.minVisits ?? 1));
    case "current_location": return context.currentLocationKey === rule.locationKey;
    case "expedition_day_gte": return (context.expeditionDay ?? 0) >= rule.value;
    case "character_state": return state.characters.some(({ characterKey, state: characterState }) => characterKey === rule.characterKey && characterState === rule.state);
    case "alive_count_gte": return state.characters.filter(({ state: characterState }) => characterState !== "dead").length >= rule.value;
  }
}

function nextRandom(state: RuntimeState, purpose: string, result: string): RandomRoll {
  const cursor = state.random.cursor;
  const value = seedrandom(`${state.random.seed}:${cursor}`)();
  state.random.cursor = cursor + 1;
  return { purpose, value, result };
}

function weightedPick<T extends { weight: number }>(
  entries: T[],
  state: RuntimeState,
  purpose: string,
  key: (entry: T) => string,
): { entry: T; roll: RandomRoll } {
  const sorted = [...entries].sort((left, right) => key(left).localeCompare(key(right)));
  const total = sorted.reduce((sum, entry) => sum + entry.weight, 0);
  const preview = seedrandom(`${state.random.seed}:${state.random.cursor}`)();
  let threshold = preview * total;
  let selected = sorted.at(-1)!;
  for (const entry of sorted) {
    threshold -= entry.weight;
    if (threshold < 0) {
      selected = entry;
      break;
    }
  }
  return { entry: selected, roll: nextRandom(state, purpose, key(selected)) };
}

function targetCharacters(
  state: RuntimeState,
  target: unknown,
  context: RuleContext,
): RuntimeCharacter[] {
  if (!target || typeof target !== "object") return [];
  const value = target as { mode?: string; characterKey?: string };
  if (value.mode === "all_shelter") return state.characters.filter(({ state: characterState }) => characterState === "shelter");
  const key = value.mode === "expedition_character"
    ? context.expeditionCharacterKey
    : value.characterKey;
  return key ? state.characters.filter(({ characterKey }) => characterKey === key) : [];
}

function inventoryForTarget(
  state: RuntimeState,
  target: unknown,
  context: RuleContext,
): RuntimeInventoryEntry[] {
  const scope = target && typeof target === "object"
    ? (target as { scope?: string }).scope
    : undefined;
  return scope === "carried_inventory" ? context.carriedInventory ?? [] : state.inventory;
}

export function applyEffects(
  effects: EffectLike[],
  state: RuntimeState,
  sourceKey: string,
  context: RuleContext = {},
): { appliedEffects: AppliedEffect[]; signals: EngineSignals } {
  const appliedEffects: AppliedEffect[] = [];
  const signals: EngineSignals = {
    unlockEventKeys: [],
    unlockItemKeys: [],
    achievementKeys: [],
    forceExpeditionReturnReasons: [],
  };

  for (const effect of effects) {
    const record = (target: string | undefined, before: unknown, after: unknown) =>
      appliedEffects.push({ type: effect.type, target, before, after });

    if (["add_item", "remove_item", "break_item", "repair_item"].includes(effect.type)) {
      const inventory = inventoryForTarget(state, effect.target, context);
      const itemKey = String(effect.itemKey);
      const quantity = Number(effect.quantity);
      let item = inventory.find((entry) => entry.itemKey === itemKey);
      if (!item) {
        item = { itemKey, intactQuantity: 0, brokenQuantity: 0 };
        inventory.push(item);
      }
      const before = { ...item };
      const condition = effect.condition === "broken" ? "brokenQuantity" : "intactQuantity";
      if (effect.type === "add_item") item[condition] += quantity;
      if (effect.type === "remove_item") {
        if (item[condition] < quantity) throw new Error(`insufficient ${itemKey} quantity`);
        item[condition] -= quantity;
      }
      if (effect.type === "break_item") {
        if (item.intactQuantity < quantity) throw new Error(`insufficient intact ${itemKey} quantity`);
        item.intactQuantity -= quantity;
        item.brokenQuantity += quantity;
      }
      if (effect.type === "repair_item") {
        if (item.brokenQuantity < quantity) throw new Error(`insufficient broken ${itemKey} quantity`);
        item.brokenQuantity -= quantity;
        item.intactQuantity += quantity;
      }
      if (item.intactQuantity + item.brokenQuantity === 0) {
        inventory.splice(inventory.indexOf(item), 1);
      }
      record(itemKey, before, { ...item });
      continue;
    }

    if (["modify_character_stat", "add_condition", "remove_condition", "change_character_state", "kill_character"].includes(effect.type)) {
      for (const character of targetCharacters(state, effect.target, context)) {
        const before = structuredClone(character);
        if (effect.type === "modify_character_stat") {
          const stat = effect.stat as keyof RuntimeCharacter["stats"];
          character.stats[stat] = Math.max(0, Math.min(100, character.stats[stat] + Number(effect.amount)));
        } else if (effect.type === "add_condition") {
          const condition = String(effect.condition);
          const existing = character.conditions.find(({ type }) => type === condition);
          const next = {
            type: condition,
            ...(effect.severity === undefined ? {} : { severity: Number(effect.severity) }),
            ...(effect.days === undefined ? {} : { remainingDays: Number(effect.days) }),
            sourceEventKey: sourceKey,
          };
          if (existing) Object.assign(existing, next);
          else character.conditions.push(next);
        } else if (effect.type === "remove_condition") {
          character.conditions = character.conditions.filter(({ type }) => type !== effect.condition);
        } else if (effect.type === "change_character_state") {
          character.state = effect.state as RuntimeCharacter["state"];
        } else {
          character.state = "dead";
          character.stats.health = 0;
        }
        record(character.characterKey, before, structuredClone(character));
      }
      continue;
    }

    if (effect.type === "set_flag") {
      const key = String(effect.key);
      const before = state.flags[key];
      state.flags[key] = effect.value as boolean | number | string;
      record(key, before, state.flags[key]);
    } else if (effect.type === "increment_counter") {
      const key = String(effect.key);
      const before = state.counters[key] ?? 0;
      state.counters[key] = Math.max(0, before + Number(effect.amount));
      record(key, before, state.counters[key]);
    } else if (effect.type === "queue_event") {
      state.eventState.queuedEvents.push({ eventKey: String(effect.eventKey), scheduledDay: state.day + Number(effect.delayDays), sourceEventKey: sourceKey });
      record(String(effect.eventKey), undefined, state.day + Number(effect.delayDays));
    } else if (effect.type === "cancel_queued_event") {
      const key = String(effect.eventKey);
      const before = state.eventState.queuedEvents.length;
      state.eventState.queuedEvents = state.eventState.queuedEvents.filter(({ eventKey }) => eventKey !== key);
      record(key, before, state.eventState.queuedEvents.length);
    } else if (effect.type === "queue_ambient") {
      state.ambientState.queuedAmbient.push({ ambientKey: String(effect.ambientKey), scheduledDay: state.day + Number(effect.delayDays), sourceEventKey: sourceKey });
      record(String(effect.ambientKey), undefined, state.day + Number(effect.delayDays));
    } else if (effect.type === "cancel_queued_ambient") {
      const key = String(effect.ambientKey);
      const before = state.ambientState.queuedAmbient.length;
      state.ambientState.queuedAmbient = state.ambientState.queuedAmbient.filter(({ ambientKey }) => ambientKey !== key);
      record(key, before, state.ambientState.queuedAmbient.length);
    } else if (effect.type === "unlock_event_in_run") {
      const key = String(effect.eventKey);
      state.unlockedEventKeys = [...new Set([...state.unlockedEventKeys, key])];
      record(key, false, true);
    } else if (effect.type === "unlock_event_for_account") {
      signals.unlockEventKeys.push(String(effect.eventKey));
    } else if (effect.type === "unlock_item_for_account") {
      signals.unlockItemKeys.push(String(effect.itemKey));
    } else if (effect.type === "discover_location") {
      const key = String(effect.locationKey);
      if (!state.locations.some(({ locationKey }) => locationKey === key)) {
        state.locations.push({ locationKey: key, status: "discovered", discoveredDay: state.day, visitedCount: 0 });
      }
      record(key, false, true);
    } else if (effect.type === "mark_location_depleted") {
      const key = String(effect.locationKey);
      const location = state.locations.find(({ locationKey }) => locationKey === key);
      if (location) {
        const before = structuredClone(location);
        location.status = "depleted";
        location.depletedUntilDay = effect.days === undefined ? undefined : state.day + Number(effect.days);
        record(key, before, structuredClone(location));
      }
    } else if (effect.type === "force_expedition_return") {
      signals.forceExpeditionReturnReasons.push(String(effect.reason));
    } else if (effect.type === "grant_achievement") {
      signals.achievementKeys.push(String(effect.achievementKey));
    } else if (effect.type === "trigger_ending") {
      const key = String(effect.endingKey);
      state.ending = { endingKey: key, triggeredAtDay: state.day };
      state.status = "completed";
      record(key, undefined, state.day);
    }
  }

  return { appliedEffects, signals };
}

function eventCanOccur(event: EventDefinitionLike, state: RuntimeState): boolean {
  const trigger = event.trigger;
  const count = state.eventState.occurredCounts[event.key] ?? 0;
  const lastDay = state.eventState.lastOccurredDay[event.key];
  return event.enabled &&
    event.delivery === "pending" &&
    !state.eventState.blockedEventKeys.includes(event.key) &&
    !state.eventState.pendingEvents.some(({ eventKey }) => eventKey === event.key) &&
    (trigger.minDay === undefined || state.day >= trigger.minDay) &&
    (trigger.maxDay === undefined || state.day <= trigger.maxDay) &&
    (trigger.maxOccurrences === undefined || count < trigger.maxOccurrences) &&
    (trigger.cooldownDays === undefined || lastDay === undefined || state.day - lastDay > trigger.cooldownDays) &&
    evaluateRule(event.requirements, state);
}

function addPendingEvent(
  state: RuntimeState,
  event: EventDefinitionLike,
  instanceId: () => string,
): void {
  const sequence = state.eventState.pendingEvents.reduce((max, entry) => Math.max(max, entry.sequence), -1) + 1;
  state.eventState.pendingEvents.push({ instanceId: instanceId(), eventKey: event.key, generatedDay: state.day, sequence });
  state.eventState.occurredCounts[event.key] = (state.eventState.occurredCounts[event.key] ?? 0) + 1;
  state.eventState.lastOccurredDay[event.key] = state.day;
  state.eventState.blockedEventKeys = [...new Set([...state.eventState.blockedEventKeys, ...event.exclusionEventKeys])];
}

export function generatePendingEvents(
  state: RuntimeState,
  definitions: EventDefinitionLike[],
  maximum: number,
  instanceId: () => string,
): RandomRoll[] {
  const rolls: RandomRoll[] = [];
  const byKey = new Map(definitions.map((definition) => [definition.key, definition]));
  const due = state.eventState.queuedEvents
    .filter(({ scheduledDay }) => scheduledDay <= state.day)
    .sort((left, right) => left.scheduledDay - right.scheduledDay || left.eventKey.localeCompare(right.eventKey));
  const consumedQueued = new Set<object>();

  for (const queued of due) {
    if (state.eventState.pendingEvents.length >= maximum) break;
    const event = byKey.get(queued.eventKey);
    if (event && eventCanOccur(event, state)) addPendingEvent(state, event, instanceId);
    consumedQueued.add(queued);
  }
  state.eventState.queuedEvents = state.eventState.queuedEvents.filter((entry) => !consumedQueued.has(entry));

  const fixed = definitions
    .filter((event) => event.trigger.mode === "fixed_day" && event.trigger.fixedDay === state.day && eventCanOccur(event, state))
    .sort((left, right) => left.key.localeCompare(right.key));
  for (const event of fixed) {
    if (state.eventState.pendingEvents.length >= maximum) break;
    addPendingEvent(state, event, instanceId);
  }

  while (state.eventState.pendingEvents.length < maximum) {
    const candidates = definitions.filter((event) => event.trigger.mode === "random" && eventCanOccur(event, state));
    if (candidates.length === 0) break;
    const { entry, roll } = weightedPick(candidates, state, `event:${state.day}`, (event) => event.key);
    rolls.push(roll);
    addPendingEvent(state, entry, instanceId);
  }
  return rolls;
}

export function applyDailyNeeds(
  state: RuntimeState,
  categories: ReadonlyMap<string, string>,
  rules: {
    foodUnitsPerCharacter: number;
    waterUnitsPerCharacter: number;
    hungerStatLoss: number;
    thirstStatLoss: number;
  },
): AppliedEffect[] {
  const characters = state.characters.filter(({ state: characterState }) => characterState === "shelter");
  const applied: AppliedEffect[] = [];

  for (const [category, unitsPerCharacter, stat, loss] of [
    ["food", rules.foodUnitsPerCharacter, "satiety", rules.hungerStatLoss],
    ["water", rules.waterUnitsPerCharacter, "hydration", rules.thirstStatLoss],
  ] as const) {
    let remaining = unitsPerCharacter * characters.length;
    const items = state.inventory
      .filter(({ itemKey, intactQuantity }) => categories.get(itemKey) === category && intactQuantity > 0)
      .sort((left, right) => left.itemKey.localeCompare(right.itemKey));
    for (const item of items) {
      if (remaining === 0) break;
      const used = Math.min(item.intactQuantity, remaining);
      const before = item.intactQuantity;
      item.intactQuantity -= used;
      remaining -= used;
      applied.push({ type: "daily_consume", target: item.itemKey, before, after: item.intactQuantity });
    }
    state.inventory = state.inventory.filter(({ intactQuantity, brokenQuantity }) => intactQuantity + brokenQuantity > 0);
    if (remaining > 0 && unitsPerCharacter > 0) {
      const affected = Math.min(characters.length, Math.ceil(remaining / unitsPerCharacter));
      for (const character of [...characters].sort((left, right) => left.characterKey.localeCompare(right.characterKey)).slice(0, affected)) {
        const before = character.stats[stat];
        character.stats[stat] = Math.max(0, before - loss);
        applied.push({ type: `daily_${category}_shortage`, target: character.characterKey, before, after: character.stats[stat] });
      }
    }
  }

  return applied;
}

export function resolveEvent(
  state: RuntimeState,
  definition: EventDefinitionLike,
  instanceId: string,
  intent: { choiceKey?: string; itemKey?: string; useFallback?: boolean },
): {
  choiceKey?: string;
  selectedItemKey?: string;
  fallbackUsed?: boolean;
  resolutionMode: "deterministic" | "weighted";
  resultKey?: string;
  title: string;
  description: string;
  randomRolls: RandomRoll[];
  appliedEffects: AppliedEffect[];
  signals: EngineSignals;
  effectLabels: string[];
} {
  const pending = state.eventState.pendingEvents.find((event) => event.instanceId === instanceId && event.eventKey === definition.key);
  if (!pending) throw new Error("pending event not found");

  let resolution: ResolutionLike;
  let choiceKey: string | undefined;
  let selectedItemKey: string | undefined;
  let fallbackUsed: boolean | undefined;
  if (definition.interaction.mode === "choices") {
    const normalAvailable = definition.interaction.choices.filter((choice) => !choice.fallbackOnly && evaluateRule(choice.requirements, state));
    const choice = definition.interaction.choices.find((candidate) => candidate.key === intent.choiceKey);
    const available = choice && (choice.fallbackOnly ? normalAvailable.length === 0 : evaluateRule(choice.requirements, state));
    if (!choice || !available) throw new Error("choice is not available");
    choiceKey = choice.key;
    resolution = choice.resolution;
  } else if (definition.interaction.mode === "item_selection") {
    const inventory = definition.interaction.source === "player" ? state.inventory : [];
    if (intent.useFallback) {
      const hasAvailableItem = definition.interaction.itemBranches.some((branch) => {
        const item = inventory.find(({ itemKey }) => itemKey === branch.itemKey);
        const quantity = branch.condition === "broken" ? item?.brokenQuantity ?? 0 : branch.condition === "intact" ? item?.intactQuantity ?? 0 : (item?.intactQuantity ?? 0) + (item?.brokenQuantity ?? 0);
        return quantity >= branch.quantity && evaluateRule(branch.requirements, state);
      });
      if (definition.interaction.noItemBranch.availability === "fallback_only" && hasAvailableItem) throw new Error("fallback is not available");
      fallbackUsed = true;
      resolution = definition.interaction.noItemBranch.resolution;
    } else {
      const branch = definition.interaction.itemBranches.find((candidate) => candidate.itemKey === intent.itemKey);
      if (!branch || !evaluateRule(branch.requirements, state)) throw new Error("item branch is not available");
      const item = inventory.find(({ itemKey }) => itemKey === branch.itemKey);
      const quantity = branch.condition === "broken" ? item?.brokenQuantity ?? 0 : branch.condition === "intact" ? item?.intactQuantity ?? 0 : (item?.intactQuantity ?? 0) + (item?.brokenQuantity ?? 0);
      if (quantity < branch.quantity) throw new Error("item branch is not available");
      selectedItemKey = branch.itemKey;
      resolution = branch.resolution;
    }
  } else {
    resolution = definition.interaction.resolution;
  }

  let title: string;
  let description: string;
  let effects: EffectLike[];
  let resultKey: string | undefined;
  const randomRolls: RandomRoll[] = [];
  if (resolution.mode === "weighted") {
    const eligible = (resolution.outcomes ?? []).filter((outcome) => evaluateRule(outcome.requirements, state));
    if (eligible.length === 0) throw new Error("resolution has no eligible outcome");
    const { entry, roll } = weightedPick(eligible, state, `resolution:${definition.key}`, (outcome) => outcome.key);
    randomRolls.push(roll);
    resultKey = entry.key;
    title = entry.title;
    description = entry.description;
    effects = entry.effects;
  } else {
    title = resolution.title ?? definition.name;
    description = resolution.description ?? definition.description;
    effects = resolution.effects ?? [];
  }

  const effectResult = applyEffects(effects, state, definition.key);
  state.eventState.pendingEvents = state.eventState.pendingEvents.filter((event) => event.instanceId !== instanceId);
  state.eventState.completedEventKeys = [...new Set([...state.eventState.completedEventKeys, definition.key])];
  if (choiceKey) state.eventState.choiceCounts[`${definition.key}:${choiceKey}`] = (state.eventState.choiceCounts[`${definition.key}:${choiceKey}`] ?? 0) + 1;

  return {
    choiceKey,
    selectedItemKey,
    fallbackUsed,
    resolutionMode: resolution.mode,
    resultKey,
    title,
    description,
    randomRolls,
    ...effectResult,
    effectLabels: effectResult.appliedEffects.map(({ type, target }) => target ? `${type}: ${target}` : type),
  };
}
