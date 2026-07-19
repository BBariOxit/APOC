import { createContentVersion, listContentVersions } from "@/server/admin/version-service";
import { jsonCreated, jsonOk, readJson, withAdmin } from "@/server/http/route-handler";

export const runtime = "nodejs";

export async function GET() {
  return withAdmin(null, async () => jsonOk(await listContentVersions()));
}

export async function POST(request: Request) {
  return withAdmin(null, async (admin) =>
    jsonCreated(await createContentVersion(admin.userId, await readJson(request))),
  );
}
