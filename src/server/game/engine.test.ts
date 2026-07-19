import assert from "node:assert/strict";
import test from "node:test";

import {
  applyDailyNeeds,
  applyEffects,
  evaluateRule,
  generatePendingEvents,
  resolveEvent,
  type EventDefinitionLike,
  type RuntimeState,
} from "@/server/game/engine";

function createState(seed = "test-seed"): RuntimeState {
  return {
    day: 1,
    status: "active",
    random: { seed, cursor: 0 },
    characters: ["lan", "hung", "mai", "nam"].map((characterKey) => ({
      characterKey,
      state: "shelter" as const,
      stats: { health: 80, satiety: 80, hydration: 80, sanity: 80 },
      conditions: [],
    })),
    inventory: [
      { itemKey: "food", intactQuantity: 4, brokenQuantity: 0 },
      { itemKey: "radio", intactQuantity: 1, brokenQuantity: 0 },
    ],
    locations: [],
    flags: {},
    counters: {},
    unlockedEventKeys: [],
    discoveredItemKeys: [],
    eventState: {
      occurredCounts: {},
      lastOccurredDay: {},
      choiceCounts: {},
      completedEventKeys: [],
      blockedEventKeys: [],
      queuedEvents: [],
      pendingEvents: [],
    },
    ambientState: { queuedAmbient: [] },
  };
}

function choiceEvent(key: string, weight = 1): EventDefinitionLike {
  return {
    key,
    name: key,
    description: "Test event",
    category: "daily",
    delivery: "pending",
    rarity: "common",
    weight,
    enabled: true,
    trigger: { mode: "random", maxOccurrences: 1 },
    exclusionEventKeys: [],
    interaction: {
      mode: "choices",
      choices: [
        {
          key: "accept",
          label: "Accept",
          resolution: {
            mode: "deterministic",
            title: "Accepted",
            description: "It worked",
            effects: [
              {
                type: "modify_character_stat",
                target: { mode: "character", characterKey: "lan" },
                stat: "sanity",
                amount: -10,
              },
              { type: "set_flag", key: "accepted", value: true },
            ],
          },
        },
      ],
    },
  };
}

test("evaluates nested rules against the current snapshot", () => {
  const state = createState();
  state.counters.visits = 2;
  assert.equal(
    evaluateRule(
      {
        all: [
          { type: "day_gte", value: 1 },
          { type: "counter_gte", key: "visits", value: 2 },
          { type: "has_item", itemKey: "radio", quantity: 1, condition: "intact" },
        ],
      },
      state,
    ),
    true,
  );
});

test("uses seed and cursor to select events deterministically", () => {
  const first = createState("same-seed");
  const second = createState("same-seed");
  const definitions = [choiceEvent("alpha", 1), choiceEvent("beta", 4)];
  generatePendingEvents(first, definitions, 1, () => "first-instance");
  generatePendingEvents(second, definitions, 1, () => "second-instance");
  assert.equal(first.eventState.pendingEvents[0]?.eventKey, second.eventState.pendingEvents[0]?.eventKey);
  assert.equal(first.random.cursor, 1);
  assert.equal(second.random.cursor, 1);
});

test("resolves an event and applies its effects once", () => {
  const state = createState();
  const event = choiceEvent("decision");
  state.eventState.pendingEvents.push({ instanceId: "instance", eventKey: event.key, generatedDay: 1, sequence: 0 });
  const result = resolveEvent(state, event, "instance", { choiceKey: "accept" });
  assert.equal(result.title, "Accepted");
  assert.equal(state.characters[0]?.stats.sanity, 70);
  assert.equal(state.flags.accepted, true);
  assert.deepEqual(state.eventState.pendingEvents, []);
  assert.deepEqual(state.eventState.completedEventKeys, ["decision"]);
  assert.equal(state.eventState.choiceCounts["decision:accept"], 1);
  assert.throws(() => resolveEvent(state, event, "instance", { choiceKey: "accept" }));
});

test("applies inventory effects atomically to the snapshot", () => {
  const state = createState();
  applyEffects(
    [
      { type: "break_item", target: { scope: "shelter" }, itemKey: "radio", quantity: 1 },
      { type: "repair_item", target: { scope: "shelter" }, itemKey: "radio", quantity: 1 },
    ],
    state,
    "test",
  );
  assert.deepEqual(state.inventory.find(({ itemKey }) => itemKey === "radio"), {
    itemKey: "radio",
    intactQuantity: 1,
    brokenQuantity: 0,
  });
});

test("consumes daily supplies and penalizes deterministic characters on shortage", () => {
  const state = createState();
  const effects = applyDailyNeeds(
    state,
    new Map([
      ["food", "food"],
      ["radio", "tool"],
    ]),
    {
      foodUnitsPerCharacter: 1,
      waterUnitsPerCharacter: 1,
      hungerStatLoss: 20,
      thirstStatLoss: 25,
    },
  );
  assert.equal(state.inventory.some(({ itemKey }) => itemKey === "food"), false);
  assert.equal(state.characters.every(({ stats }) => stats.hydration === 55), true);
  assert.equal(effects.filter(({ type }) => type === "daily_water_shortage").length, 4);
});
