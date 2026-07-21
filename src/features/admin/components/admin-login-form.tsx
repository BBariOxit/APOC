"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      const result = await signIn("credentials", {
        identifier: form.get("identifier"),
        password: form.get("password"),
        redirect: false,
      });
      if (result?.error) {
        setError("Thông tin đăng nhập không hợp lệ hoặc tài khoản đã bị khoá.");
        return;
      }
      router.push("/admin/content");
      router.refresh();
    } catch {
      setError("Không thể kết nối tới máy chủ. Vui lòng thử lại.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="identifier" className="text-sm font-medium">
          Email hoặc username
        </label>
        <Input id="identifier" name="identifier" autoComplete="username" required />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Mật khẩu
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          maxLength={128}
          required
        />
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Đang xác thực…" : "Đăng nhập quản trị"}
      </Button>
    </form>
  );
}
