import { z } from "zod";

import { createContentVersion } from "@/server/admin/version-service";
import { semverSchema } from "@/server/admin/schemas";
import { assertObjectId, jsonCreated, readJson, withAdmin } from "@/server/http/route-handler";

const cloneRequestSchema = z
  .object({
    version: semverSchema,
    changelog: z.string().max(10_000).default(""),
  })
  .strict();

interface Context {
  params: Promise<{ versionId: string }>;
}

export async function POST(request: Request, context: Context) {
  return withAdmin(context, async (admin, { params }) => {
    const { versionId } = await params;
    assertObjectId(versionId, "versionId");
    const body = cloneRequestSchema.parse(await readJson(request));
    return jsonCreated(
      await createContentVersion(admin.userId, {
        ...body,
        cloneFromVersionId: versionId,
      }),
    );
  });
}
