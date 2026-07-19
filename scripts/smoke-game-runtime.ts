import * as nextEnvModule from "@next/env";

const nextEnv =
  (nextEnvModule as unknown as { default?: typeof nextEnvModule }).default ??
  nextEnvModule;
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

async function main() {
  const { default: mongoose } = await import("mongoose");
  const { connectToDatabase } = await import("@/server/db/mongoose");
  const { UserModel } = await import("@/server/db/models");
  const {
    advanceGameDay,
    createGameRun,
    resolveGameEvent,
  } = await import("@/server/game/game-run-service");

  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let userId: string | undefined;

  try {
    await connectToDatabase();
    const user = await UserModel.create({
      email: `runtime-smoke-${suffix}@example.invalid`,
      username: `smoke_${suffix.slice(-8)}`,
      role: "player",
      status: "active",
    });
    userId = user._id.toString();

    let run = await createGameRun(userId, { mode: "normal" });
    if (run.characters.length !== 4) {
      throw new Error("run did not initialize four characters");
    }

    for (const event of [...run.pendingEvents]) {
      const intent = event.choices.find(({ available }) => available);
      if (!intent) throw new Error(`event ${event.key} has no available intent`);
      run = await resolveGameEvent(userId, run.id, event.instanceId, {
        commandId: crypto.randomUUID(),
        expectedRevision: run.revision,
        intentKey: intent.key,
      });
    }

    const previousDay = run.day;
    run = await advanceGameDay(userId, run.id, {
      commandId: crypto.randomUUID(),
      expectedRevision: run.revision,
    });
    if (run.day !== previousDay + 1) {
      throw new Error("advance-day did not increment the day");
    }
    process.stdout.write(
      `Runtime smoke passed: run ${run.id}, day ${run.day}, revision ${run.revision}.\n`,
    );
  } finally {
    if (userId && mongoose.connection.db) {
      const id = new mongoose.Types.ObjectId(userId);
      const runIds = await mongoose.connection.db
        .collection("game_runs")
        .find({ userId: id }, { projection: { _id: 1 } })
        .map(({ _id }) => _id)
        .toArray();
      await mongoose.connection.db.collection("run_event_logs").deleteMany({ runId: { $in: runIds } });
      await mongoose.connection.db.collection("run_expeditions").deleteMany({ runId: { $in: runIds } });
      await mongoose.connection.db.collection("user_achievements").deleteMany({ userId: id });
      await mongoose.connection.db.collection("player_profiles").deleteMany({ userId: id });
      await mongoose.connection.db.collection("game_runs").deleteMany({ userId: id });
      await mongoose.connection.db.collection("users").deleteOne({ _id: id });
    }
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  process.stderr.write(
    `Runtime smoke failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
