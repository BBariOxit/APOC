import {
  createGameRun,
  getActiveGameRun,
} from "@/server/game/game-run-service";
import { jsonCreated, jsonOk, readJson, withPlayer } from "@/server/http/route-handler";

export async function GET() {
  return withPlayer(undefined, async (player) =>
    jsonOk(await getActiveGameRun(player.userId)),
  );
}

export async function POST(request: Request) {
  return withPlayer(undefined, async (player) =>
    jsonCreated(await createGameRun(player.userId, await readJson(request))),
  );
}
