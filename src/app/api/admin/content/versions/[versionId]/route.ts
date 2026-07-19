import {
  deleteContentVersion,
  getContentVersion,
  updateContentVersion,
} from "@/server/admin/version-service";
import {
  assertObjectId,
  assertMutationRequest,
  jsonNoContent,
  jsonOk,
  readJson,
  withAdmin,
} from "@/server/http/route-handler";

interface Context {
  params: Promise<{ versionId: string }>;
}

export async function GET(_request: Request, context: Context) {
  return withAdmin(context, async (_admin, { params }) => {
    const { versionId } = await params;
    assertObjectId(versionId, "versionId");
    return jsonOk(await getContentVersion(versionId));
  });
}

export async function PATCH(request: Request, context: Context) {
  return withAdmin(context, async (admin, { params }) => {
    const { versionId } = await params;
    assertObjectId(versionId, "versionId");
    return jsonOk(
      await updateContentVersion(versionId, admin.userId, await readJson(request)),
    );
  });
}

export async function DELETE(request: Request, context: Context) {
  return withAdmin(context, async (admin, { params }) => {
    assertMutationRequest(request);
    const { versionId } = await params;
    assertObjectId(versionId, "versionId");
    await deleteContentVersion(versionId, admin.userId);
    return jsonNoContent();
  });
}
