import { contentKeySchema } from "@/server/validation/content";
import { contentResourceSchema } from "@/server/admin/content-registry";
import { deleteContent, getContent, updateContent } from "@/server/admin/content-service";
import {
  assertMutationRequest,
  assertObjectId,
  jsonNoContent,
  jsonOk,
  readJson,
  withAdmin,
} from "@/server/http/route-handler";

interface Context {
  params: Promise<{ versionId: string; resource: string; key: string }>;
}

async function parseParams(params: Context["params"]) {
  const values = await params;
  assertObjectId(values.versionId, "versionId");
  return {
    versionId: values.versionId,
    resource: contentResourceSchema.parse(values.resource),
    key: contentKeySchema.parse(values.key),
  };
}

export async function GET(_request: Request, context: Context) {
  return withAdmin(context, async (_admin, { params }) => {
    const { versionId, resource, key } = await parseParams(params);
    return jsonOk(await getContent(versionId, resource, key));
  });
}

export async function PATCH(request: Request, context: Context) {
  return withAdmin(context, async (admin, { params }) => {
    const { versionId, resource, key } = await parseParams(params);
    return jsonOk(
      await updateContent(
        versionId,
        resource,
        key,
        admin.userId,
        await readJson(request),
      ),
    );
  });
}

export async function DELETE(request: Request, context: Context) {
  return withAdmin(context, async (admin, { params }) => {
    assertMutationRequest(request);
    const { versionId, resource, key } = await parseParams(params);
    await deleteContent(versionId, resource, key, admin.userId);
    return jsonNoContent();
  });
}
