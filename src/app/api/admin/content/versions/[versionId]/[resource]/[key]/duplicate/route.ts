import { contentKeySchema } from "@/server/validation/content";
import { contentResourceSchema } from "@/server/admin/content-registry";
import { duplicateContent } from "@/server/admin/content-service";
import { assertObjectId, jsonCreated, readJson, withAdmin } from "@/server/http/route-handler";

interface Context {
  params: Promise<{ versionId: string; resource: string; key: string }>;
}

export async function POST(request: Request, context: Context) {
  return withAdmin(context, async (admin, { params }) => {
    const values = await params;
    assertObjectId(values.versionId, "versionId");
    const resource = contentResourceSchema.parse(values.resource);
    const key = contentKeySchema.parse(values.key);
    return jsonCreated(
      await duplicateContent(
        values.versionId,
        resource,
        key,
        admin.userId,
        await readJson(request),
      ),
    );
  });
}
