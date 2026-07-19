import { archiveContentVersion } from "@/server/admin/version-service";
import { assertObjectId, assertMutationRequest, jsonOk, withAdmin } from "@/server/http/route-handler";

interface Context {
  params: Promise<{ versionId: string }>;
}

export async function POST(request: Request, context: Context) {
  return withAdmin(context, async (admin, { params }) => {
    assertMutationRequest(request);
    const { versionId } = await params;
    assertObjectId(versionId, "versionId");
    return jsonOk(await archiveContentVersion(versionId, admin.userId));
  });
}
