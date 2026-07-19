import { getGameRun } from "@/server/game/game-run-service";
import { assertObjectId, jsonOk, withPlayer } from "@/server/http/route-handler";

interface Context { params: Promise<{ runId: string }> }

export async function GET(_request: Request, context: Context) {
  return withPlayer(context, async (player, { params }) => {
    const { runId } = await params;
    assertObjectId(runId, "runId");
    return jsonOk(await getGameRun(player.userId, runId));
  });
}
