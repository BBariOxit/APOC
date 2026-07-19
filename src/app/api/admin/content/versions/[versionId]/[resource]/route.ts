import { contentResourceSchema } from "@/server/admin/content-registry";
import { createContent, listContent } from "@/server/admin/content-service";
import { assertObjectId, jsonCreated, jsonOk, readJson, withAdmin } from "@/server/http/route-handler";

interface Context {
  params: Promise<{ versionId: string; resource: string }>;
}

function optionalBoolean(value: string | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export async function GET(request: Request, context: Context) {
  return withAdmin(context, async (_admin, { params }) => {
    const { versionId, resource: rawResource } = await params;
    assertObjectId(versionId, "versionId");
    const resource = contentResourceSchema.parse(rawResource);
    const url = new URL(request.url);
    const limitValue = Number(url.searchParams.get("limit") ?? 30);
    const filters: Record<string, string | boolean> = {};
    for (const field of [
      "category",
      "delivery",
      "rarity",
      "dangerLevel",
      "difficulty",
      "progressType",
      "type",
    ]) {
      const value = url.searchParams.get(field);
      if (value) filters[field] = value.slice(0, 80);
    }
    const hidden = optionalBoolean(url.searchParams.get("hidden"));
    if (hidden !== undefined) filters.hidden = hidden;

    return jsonOk(
      await listContent(versionId, resource, {
        cursor: url.searchParams.get("cursor") ?? undefined,
        limit: Number.isFinite(limitValue) ? limitValue : 30,
        q: url.searchParams.get("q") ?? undefined,
        enabled: optionalBoolean(url.searchParams.get("enabled")),
        tag: url.searchParams.get("tag")?.slice(0, 80),
        filters,
      }),
    );
  });
}

export async function POST(request: Request, context: Context) {
  return withAdmin(context, async (admin, { params }) => {
    const { versionId, resource: rawResource } = await params;
    assertObjectId(versionId, "versionId");
    const resource = contentResourceSchema.parse(rawResource);
    return jsonCreated(
      await createContent(versionId, resource, admin.userId, await readJson(request)),
    );
  });
}
