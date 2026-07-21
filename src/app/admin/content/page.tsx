import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminContentManager } from "@/features/admin/components/admin-content-manager";
import { requireAdmin } from "@/server/auth/admin";
import { ApiError } from "@/server/http/api-error";

export const metadata: Metadata = { title: "Content Studio" };

export default async function AdminContentPage() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof ApiError && [401, 403].includes(error.status)) {
      redirect("/admin/login");
    }
    throw error;
  }
  return <AdminContentManager username={admin.username} />;
}
