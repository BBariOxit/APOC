import { validateContentVersion } from "@/server/admin/version-service";
import { assertObjectId, jsonOk, withAdmin } from "@/server/http/route-handler";

interface Context {
  params: Promise<{ versionId: string }>;
}

export async function POST(_request: Request, context: Context) {
  return withAdmin(context, async (_admin, { params }) => {
    const { versionId } = await params;
    assertObjectId(versionId, "versionId");
    return jsonOk(await validateContentVersion(versionId));
  });
}
