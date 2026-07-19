import { listAdminAuditLogs } from "@/server/admin/audit-service";
import { jsonOk, withAdmin } from "@/server/http/route-handler";

export async function GET(request: Request) {
  return withAdmin(null, async () => {
    const search = new URL(request.url).searchParams;
    const limit = Number(search.get("limit") ?? 50);
    return jsonOk(
      await listAdminAuditLogs({
        cursor: search.get("cursor") ?? undefined,
        limit: Number.isFinite(limit) ? limit : 50,
        contentVersionId: search.get("contentVersionId") ?? undefined,
        adminUserId: search.get("adminUserId") ?? undefined,
        entityType: search.get("entityType") ?? undefined,
        entityKey: search.get("entityKey") ?? undefined,
      }),
    );
  });
}
