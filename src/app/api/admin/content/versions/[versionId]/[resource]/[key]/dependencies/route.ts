import { contentKeySchema } from "@/server/validation/content";
import { contentResourceSchema } from "@/server/admin/content-registry";
import { getContentDependencies } from "@/server/admin/content-service";
import { assertObjectId, jsonOk, withAdmin } from "@/server/http/route-handler";

interface Context {
  params: Promise<{ versionId: string; resource: string; key: string }>;
}

export async function GET(_request: Request, context: Context) {
  return withAdmin(context, async (_admin, { params }) => {
    const values = await params;
    assertObjectId(values.versionId, "versionId");
    const resource = contentResourceSchema.parse(values.resource);
    const key = contentKeySchema.parse(values.key);
    return jsonOk(await getContentDependencies(values.versionId, resource, key));
  });
}
