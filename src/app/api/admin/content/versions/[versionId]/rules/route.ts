import { getGameRules, updateGameRules } from "@/server/admin/version-service";
import { assertObjectId, jsonOk, readJson, withAdmin } from "@/server/http/route-handler";

interface Context {
  params: Promise<{ versionId: string }>;
}

export async function GET(_request: Request, context: Context) {
  return withAdmin(context, async (_admin, { params }) => {
    const { versionId } = await params;
    assertObjectId(versionId, "versionId");
    return jsonOk(await getGameRules(versionId));
  });
}

export async function PUT(request: Request, context: Context) {
  return withAdmin(context, async (admin, { params }) => {
    const { versionId } = await params;
    assertObjectId(versionId, "versionId");
    return jsonOk(
      await updateGameRules(versionId, admin.userId, await readJson(request)),
    );
  });
}
