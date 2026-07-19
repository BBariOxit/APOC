import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminContentManager } from "@/features/admin/components/admin-content-manager";
import { requireAdmin } from "@/server/auth/admin";

export const metadata: Metadata = { title: "Content Studio" };

export default async function AdminContentPage() {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) redirect("/admin/login");
  return <AdminContentManager username={admin.username} />;
}
