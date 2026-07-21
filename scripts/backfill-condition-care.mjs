import nextEnv from "@next/env";
import mongoose from "mongoose";
import { stdout } from "node:process";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const conditionInputs = [
  ["wounded", "Bị thương", "Vết thương do sự kiện gây ra.", "danger", { type: "runtime" }],
  ["anxious", "Lo âu", "Lo âu do sự kiện gây ra.", "warning", { type: "runtime" }],
  ["thirsty", "Đang khát", "Nước cơ thể xuống thấp.", "warning", { type: "stat_below", stat: "hydration", threshold: 35 }],
  ["dehydrated", "Mất nước", "Nước cơ thể ở mức nguy hiểm.", "danger", { type: "stat_below", stat: "hydration", threshold: 25 }],
  ["hungry", "Đang đói", "Dinh dưỡng xuống thấp.", "warning", { type: "stat_below", stat: "satiety", threshold: 35 }],
  ["starving", "Kiệt sức vì đói", "Dinh dưỡng ở mức nguy hiểm.", "danger", { type: "stat_below", stat: "satiety", threshold: 15 }],
  ["distressed", "Lo âu", "Tinh thần xuống thấp.", "warning", { type: "stat_below", stat: "sanity", threshold: 35 }],
  ["critical_health", "Sức khỏe nguy cấp", "Sức khỏe ở mức nguy hiểm.", "danger", { type: "stat_below", stat: "health", threshold: 35 }],
  ["resting", "Cần nghỉ ngơi", "Chưa thể tiếp tục đi thám hiểm.", "neutral", { type: "expedition_cooldown" }],
];

const careByItemKey = {
  canned_food: { action: "feed", statChanges: { satiety: 25 }, removesConditionKeys: [] },
  clean_water: { action: "hydrate", statChanges: { hydration: 30 }, removesConditionKeys: [] },
  medicine: { action: "heal", statChanges: { health: 25 }, removesConditionKeys: ["wounded"] },
};

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  const database = mongoose.connection.db;
  if (!database) throw new Error("MongoDB connection is unavailable");
  const versions = await database.collection("content_versions").find({}).toArray();
  let conditionWrites = 0;
  let itemWrites = 0;

  for (const version of versions) {
    const now = new Date();
    const conditionResult = await database.collection("condition_definitions").bulkWrite(
      conditionInputs.map(([key, name, description, tone, derivation]) => ({
        updateOne: {
          filter: { contentVersionId: version._id, key },
          update: {
            $setOnInsert: { contentVersionId: version._id, key, enabled: true, createdBy: version.createdBy, name, description, tone, derivation, createdAt: now, updatedAt: now, __v: 0 },
          },
          upsert: true,
        },
      })),
    );
    conditionWrites += conditionResult.modifiedCount + conditionResult.upsertedCount;

    for (const [key, care] of Object.entries(careByItemKey)) {
      const itemResult = await database.collection("item_definitions").updateOne(
        { contentVersionId: version._id, key, care: { $exists: false } },
        { $set: { care, updatedAt: now } },
      );
      itemWrites += itemResult.modifiedCount;
    }
  }

  stdout.write(`Backfill completed for ${versions.length} content version(s): ${conditionWrites} condition writes, ${itemWrites} item writes.\n`);
}

main()
  .catch((error) => {
    stdout.write(`Failed: ${error instanceof Error ? error.message : "Unknown error"}\n`);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
