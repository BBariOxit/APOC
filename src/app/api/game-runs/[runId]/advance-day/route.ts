import { advanceGameDay } from "@/server/game/game-run-service";
import { assertObjectId, jsonOk, readJson, withPlayer } from "@/server/http/route-handler";

interface Context { params: Promise<{ runId: string }> }

export async function POST(request: Request, context: Context) {
  return withPlayer(context, async (player, { params }) => {
    const { runId } = await params;
    assertObjectId(runId, "runId");
    return jsonOk(await advanceGameDay(player.userId, runId, await readJson(request)));
  });
}
