import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLoginForm } from "@/features/admin/components/admin-login-form";

export const metadata: Metadata = { title: "Đăng nhập quản trị" };

export default async function AdminLoginPage() {
  const session = await auth();
  if (session?.user?.role === "admin") redirect("/admin/content");

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-4 text-zinc-100">
      <Card className="w-full max-w-md bg-zinc-900/70">
        <CardHeader>
          <CardTitle className="text-xl">APOC Content Studio</CardTitle>
          <CardDescription>Chỉ tài khoản quản trị đang hoạt động mới có quyền truy cập.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminLoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
