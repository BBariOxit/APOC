import { contentResourceSchema } from "@/server/admin/content-registry";
import { bulkUpdateContent } from "@/server/admin/content-service";
import { assertObjectId, jsonOk, readJson, withAdmin } from "@/server/http/route-handler";

interface Context {
  params: Promise<{ versionId: string; resource: string }>;
}

export async function POST(request: Request, context: Context) {
  return withAdmin(context, async (admin, { params }) => {
    const values = await params;
    assertObjectId(values.versionId, "versionId");
    const resource = contentResourceSchema.parse(values.resource);
    return jsonOk(
      await bulkUpdateContent(
        values.versionId,
        resource,
        admin.userId,
        await readJson(request),
      ),
    );
  });
}
