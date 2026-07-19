import { z } from "zod";

import { contentResourceSchema, getContentResourceConfig } from "@/server/admin/content-registry";
import { assertObjectId, jsonOk, readJson, withAdmin } from "@/server/http/route-handler";

const requestSchema = z
  .object({
    resource: contentResourceSchema,
    content: z.unknown(),
  })
  .strict();

interface Context {
  params: Promise<{ versionId: string }>;
}

export async function POST(request: Request, context: Context) {
  return withAdmin(context, async (_admin, { params }) => {
    const { versionId } = await params;
    assertObjectId(versionId, "versionId");
    const body = requestSchema.parse(await readJson(request));
    const parsed = getContentResourceConfig(body.resource).schema.safeParse(body.content);
    return jsonOk(
      parsed.success
        ? { valid: true, content: parsed.data }
        : { valid: false, issues: parsed.error.issues },
    );
  });
}
