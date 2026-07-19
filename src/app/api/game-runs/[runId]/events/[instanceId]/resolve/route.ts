import { resolveGameEvent } from "@/server/game/game-run-service";
import { assertObjectId, jsonOk, readJson, withPlayer } from "@/server/http/route-handler";
import { ApiError } from "@/server/http/api-error";

interface Context { params: Promise<{ runId: string; instanceId: string }> }

export async function POST(request: Request, context: Context) {
  return withPlayer(context, async (player, { params }) => {
    const { runId, instanceId } = await params;
    assertObjectId(runId, "runId");
    if (!instanceId || instanceId.length > 100) {
      throw new ApiError(400, "VALIDATION_ERROR", "instanceId is invalid");
    }
    return jsonOk(await resolveGameEvent(player.userId, runId, instanceId, await readJson(request)));
  });
}
