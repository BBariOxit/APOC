import { getContentCatalog } from "@/server/admin/content-service";
import { assertObjectId, jsonOk, withAdmin } from "@/server/http/route-handler";

interface Context {
  params: Promise<{ versionId: string }>;
}

export async function GET(_request: Request, context: Context) {
  return withAdmin(context, async (_admin, { params }) => {
    const { versionId } = await params;
    assertObjectId(versionId, "versionId");
    return jsonOk(await getContentCatalog(versionId));
  });
}
