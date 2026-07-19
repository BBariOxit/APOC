import nextEnv from "@next/env";
import mongoose from "mongoose";
import { stdout } from "node:process";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const adminArgument = process.argv.find((argument) => argument.startsWith("--admin="));
const adminName = adminArgument?.slice("--admin=".length);

function withMetadata(contentVersionId, createdBy, key, content) {
  const now = new Date();
  return {
    contentVersionId,
    createdBy,
    key,
    enabled: true,
    ...content,
    createdAt: now,
    updatedAt: now,
    __v: 0,
  };
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  if (!adminName) throw new Error("Usage: npm run content:seed -- --admin=<username>");

  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  const database = mongoose.connection.db;
  if (!database) throw new Error("MongoDB connection is unavailable");

  const admin = await database.collection("users").findOne({
    usernameKey: adminName.trim().normalize("NFKC").toLocaleLowerCase("en-US"),
    role: "admin",
    status: "active",
  });
  if (!admin) throw new Error(`Active admin ${adminName} was not found`);
  if ((await database.collection("content_versions").countDocuments()) > 0) {
    throw new Error("Seed refused: this database already contains a content version");
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const now = new Date();
      const versionId = new mongoose.Types.ObjectId();
      await database.collection("content_versions").insertOne(
        {
          _id: versionId,
          version: "1.0.0",
          status: "published",
          changelog: "Baseline playable content",
          createdBy: admin._id,
          publishedAt: now,
          createdAt: now,
          updatedAt: now,
          __v: 0,
        },
        { session },
      );

      const characters = [
        ["lan", "Lan", "Bác sĩ bình tĩnh và thực tế.", [88, 72, 76, 84], ["medic"]],
        ["hung", "Hùng", "Thợ máy có sức bền cao.", [92, 80, 68, 70], ["mechanic"]],
        ["mai", "Mai", "Người quan sát nhạy bén.", [76, 74, 82, 90], ["observer"]],
        ["nam", "Nam", "Người tìm đường giàu kinh nghiệm.", [84, 78, 78, 76], ["scout"]],
      ].map(([key, name, description, stats, traits]) =>
        withMetadata(versionId, admin._id, key, {
          name,
          description,
          avatarUrl: `https://placehold.co/256x256/18181b/e4e4e7?text=${name}`,
          baseStats: {
            health: stats[0],
            satiety: stats[1],
            hydration: stats[2],
            sanity: stats[3],
          },
          baseLoadoutSlots: 4,
          traits,
        }),
      );
      await database.collection("character_definitions").insertMany(characters, { session });

      const itemInputs = [
        ["canned_food", "Đồ hộp", "Một khẩu phần thức ăn bảo quản lâu.", "food", true, 24, false, ["ration"]],
        ["clean_water", "Nước sạch", "Một đơn vị nước uống đã lọc.", "water", true, 24, false, ["ration"]],
        ["medicine", "Thuốc", "Vật tư y tế cơ bản.", "medical", true, 8, false, ["care"]],
        ["radio", "Radio", "Thiết bị liên lạc cũ nhưng còn hoạt động.", "tool", false, undefined, true, ["signal"]],
      ];
      const items = itemInputs.map(([key, name, description, category, stackable, maxStack, canBreak, tags]) =>
        withMetadata(versionId, admin._id, key, {
          name,
          description,
          iconUrl: `https://placehold.co/128x128/18181b/e4e4e7?text=${String(name).slice(0, 1)}`,
          category,
          stackable,
          ...(maxStack === undefined ? {} : { maxStack }),
          canBreak,
          hidden: false,
          tags,
        }),
      );
      await database.collection("item_definitions").insertMany(items, { session });

      const deterministic = (title, description, effects = []) => ({ mode: "deterministic", title, description, effects });
      const events = [
        withMetadata(versionId, admin._id, "radio_signal", {
          name: "Tín hiệu trên radio",
          description: "Một giọng nói đứt quãng gọi đúng tên của nhóm.",
          category: "story",
          delivery: "pending",
          rarity: "uncommon",
          weight: 2,
          hidden: false,
          tags: ["signal"],
          trigger: { mode: "fixed_day", fixedDay: 1, maxOccurrences: 1 },
          exclusionEventKeys: [],
          interaction: {
            mode: "choices",
            choices: [
              {
                key: "answer",
                label: "Trả lời",
                description: "Dùng radio để phản hồi tín hiệu.",
                requirements: { type: "has_item", itemKey: "radio", condition: "intact", quantity: 1 },
                resolution: deterministic("Đã bắt liên lạc", "Tín hiệu xác nhận có một nơi trú ẩn khác ở phía bắc.", [
                  { type: "set_flag", key: "northern_shelter_known", value: true },
                  { type: "modify_character_stat", target: { mode: "all_shelter" }, stat: "sanity", amount: 5 },
                ]),
              },
              {
                key: "ignore",
                label: "Giữ im lặng",
                description: "Không để lộ vị trí của nhóm.",
                resolution: deterministic("Tín hiệu tắt dần", "Căn hầm lại chìm vào im lặng.", [
                  { type: "modify_character_stat", target: { mode: "all_shelter" }, stat: "sanity", amount: -3 },
                ]),
              },
            ],
          },
        }),
        withMetadata(versionId, admin._id, "stranger_at_door", {
          name: "Người lạ trước cửa",
          description: "Ba tiếng gõ ngắn vang lên từ cánh cửa thép.",
          category: "daily",
          delivery: "pending",
          rarity: "common",
          weight: 5,
          hidden: false,
          tags: ["shelter"],
          trigger: { mode: "random", minDay: 1, maxOccurrences: 3, cooldownDays: 2 },
          exclusionEventKeys: [],
          interaction: {
            mode: "choices",
            choices: [
              {
                key: "open",
                label: "Mở cửa",
                resolution: {
                  mode: "weighted",
                  outcomes: [
                    { key: "trader", weight: 3, title: "Một người buôn bán", description: "Người lạ để lại hai chai nước rồi rời đi.", effects: [{ type: "add_item", target: { scope: "shelter" }, itemKey: "clean_water", condition: "intact", quantity: 2 }] },
                    { key: "threat", weight: 1, title: "Một cái bẫy", description: "Nhóm kịp đóng cửa nhưng tinh thần bị ảnh hưởng.", effects: [{ type: "modify_character_stat", target: { mode: "all_shelter" }, stat: "sanity", amount: -8 }] },
                  ],
                },
              },
              { key: "wait", label: "Chờ họ rời đi", resolution: deterministic("Yên tĩnh trở lại", "Tiếng bước chân xa dần ngoài hành lang.") },
            ],
          },
        }),
        withMetadata(versionId, admin._id, "ruined_pharmacy_event", {
          name: "Quầy thuốc đổ nát",
          description: "Một tủ thuốc còn sót lại sau lớp bê tông.",
          category: "location",
          delivery: "expedition",
          rarity: "uncommon",
          weight: 3,
          hidden: false,
          tags: ["medical"],
          trigger: { mode: "location_pool", maxOccurrences: 1 },
          exclusionEventKeys: [],
          interaction: { mode: "scripted", resolution: deterministic("Tìm thấy thuốc", "Một ít thuốc vẫn còn dùng được.", [{ type: "add_item", target: { scope: "carried_inventory" }, itemKey: "medicine", condition: "intact", quantity: 1 }]) },
        }),
      ];
      await database.collection("event_definitions").insertMany(events, { session });

      await database.collection("location_definitions").insertOne(withMetadata(versionId, admin._id, "ruined_pharmacy", {
        name: "Hiệu thuốc đổ nát",
        description: "Một hiệu thuốc cũ cách hầm hai ngày đường.",
        hidden: false,
        dangerLevel: "medium",
        travelDays: { min: 1, max: 2 },
        tags: ["medical"],
        eventPool: [{ eventKey: "ruined_pharmacy_event", weight: 1 }],
      }), { session });

      await database.collection("ambient_definitions").insertOne(withMetadata(versionId, admin._id, "pipes_at_night", {
        name: "Tiếng động trong đường ống",
        timeLabel: "Đêm",
        rarity: "common",
        weight: 4,
        hidden: false,
        tags: ["shelter"],
        trigger: { mode: "random", minDay: 2, maxOccurrences: 4, cooldownDays: 2 },
        exclusionAmbientKeys: [],
        resolution: deterministic("Đường ống rung lên", "Âm thanh kim loại khiến mọi người khó ngủ.", [{ type: "modify_character_stat", target: { mode: "all_shelter" }, stat: "sanity", amount: -2 }]),
      }), { session });

      await database.collection("ending_definitions").insertOne(withMetadata(versionId, admin._id, "survived_thirty_days", {
        name: "Tín hiệu cứu hộ",
        description: "Sau ba mươi ngày, nhóm nhận được tín hiệu sơ tán xác thực.",
        type: "good",
        priority: 10,
        hidden: false,
        requirements: { type: "day_gte", value: 30 },
      }), { session });

      await database.collection("achievement_definitions").insertOne(withMetadata(versionId, admin._id, "first_decision", {
        name: "Quyết định đầu tiên",
        description: "Hoàn thành sự kiện tín hiệu radio.",
        difficulty: "easy",
        hidden: false,
        progressType: "binary",
        target: 1,
        requirements: { type: "event_completed", eventKey: "radio_signal" },
        rewards: [],
      }), { session });

      await database.collection("game_rule_definitions").insertOne({
        contentVersionId: versionId,
        runSetup: {
          characterKeys: ["lan", "hung", "mai", "nam"],
          inventory: [
            { itemKey: "canned_food", intactQuantity: 12, brokenQuantity: 0 },
            { itemKey: "clean_water", intactQuantity: 12, brokenQuantity: 0 },
            { itemKey: "medicine", intactQuantity: 2, brokenQuantity: 0 },
            { itemKey: "radio", intactQuantity: 1, brokenQuantity: 0 },
          ],
        },
        statRules: { criticalBelow: 35 },
        dailyRules: {
          maxEventsPerDay: 2,
          maxAmbientPerDay: 1,
          ambientChance: 0.65,
          foodUnitsPerCharacter: 1,
          waterUnitsPerCharacter: 1,
          hungerStatLoss: 20,
          thirstStatLoss: 25,
        },
        expeditionRules: { visibleLoadoutSlots: 4, healthPerLostSlot: 25, returnCooldownDays: 5, maxDurationDays: 14, maxJournalEntries: 32 },
        createdAt: now,
        updatedAt: now,
        __v: 0,
      }, { session });
    });
  } finally {
    await session.endSession();
  }

  stdout.write("Published baseline content 1.0.0 created successfully.\n");
}

main()
  .catch((error) => {
    stdout.write(`Failed: ${error instanceof Error ? error.message : "Unknown error"}\n`);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
