"use client";

import { LoaderCircle, LogIn, UserPlus } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

type AuthMode = "login" | "register";

interface PlayerAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthenticated: () => void | Promise<void>;
  initialMode?: AuthMode;
}

interface AuthErrorEnvelope {
  error?: { message?: string };
}

export function PlayerAuthDialog({
  open,
  onOpenChange,
  onAuthenticated,
  initialMode = "login",
}: PlayerAuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
  }

  async function authenticate(identifier: FormDataEntryValue | null, password: FormDataEntryValue | null) {
    const result = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });
    if (result?.error) {
      throw new Error("Email, tên người chơi hoặc mật khẩu không đúng.");
    }
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      await authenticate(form.get("identifier"), form.get("password"));
      onOpenChange(false);
      await onAuthenticated();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Không thể kết nối tới máy chủ. Vui lòng thử lại.",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== form.get("passwordConfirmation")) {
      setError("Mật khẩu nhập lại chưa khớp.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          username: form.get("username"),
          password,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as AuthErrorEnvelope;
      if (!response.ok) {
        throw new Error(
          payload.error?.message ?? "Không thể tạo tài khoản. Vui lòng kiểm tra lại thông tin.",
        );
      }

      await authenticate(form.get("email"), password);
      onOpenChange(false);
      await onAuthenticated();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Không thể kết nối tới máy chủ. Vui lòng thử lại.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-zinc-950 p-5 text-zinc-100 sm:max-w-md">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-xl">Vào hầm trú ẩn</DialogTitle>
          <DialogDescription className="leading-6 text-zinc-400">
            Đăng nhập để tiếp tục ván đang chơi hoặc tạo tài khoản mới.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(value) => changeMode(value as AuthMode)}>
          <TabsList className="grid h-10 w-full grid-cols-2 bg-zinc-900">
            <TabsTrigger value="login">Đăng nhập</TabsTrigger>
            <TabsTrigger value="register">Đăng ký</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Email hoặc tên người chơi" htmlFor="player-login-identifier">
                <Input
                  id="player-login-identifier"
                  name="identifier"
                  autoComplete="username"
                  minLength={3}
                  maxLength={320}
                  required
                />
              </Field>
              <Field label="Mật khẩu" htmlFor="player-login-password">
                <Input
                  id="player-login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </Field>
              {error && <p role="alert" className="text-sm leading-5 text-red-300">{error}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={pending}>
                {pending ? <LoaderCircle className="animate-spin" /> : <LogIn />}
                {pending ? "Đang đăng nhập…" : "Đăng nhập"}
              </Button>
              <p className="text-center text-xs text-zinc-500">
                Chưa có tài khoản?{" "}
                <button type="button" className="text-zinc-200 underline underline-offset-4" onClick={() => changeMode("register")}>
                  Đăng ký ngay
                </button>
              </p>
            </form>
          </TabsContent>

          <TabsContent value="register" className="mt-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tên người chơi" htmlFor="player-register-username">
                  <Input
                    id="player-register-username"
                    name="username"
                    autoComplete="username"
                    minLength={3}
                    maxLength={32}
                    pattern="[\p{L}\p{N}_-]+"
                    title="Dùng 3–32 chữ cái, chữ số, dấu gạch dưới hoặc gạch ngang."
                    required
                  />
                </Field>
                <Field label="Email" htmlFor="player-register-email">
                  <Input
                    id="player-register-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={320}
                    required
                  />
                </Field>
              </div>
              <Field label="Mật khẩu" htmlFor="player-register-password">
                <Input
                  id="player-register-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  title="Mật khẩu cần ít nhất 8 ký tự, gồm chữ và số."
                  required
                />
                <p className="mt-1.5 text-xs text-zinc-500">Ít nhất 8 ký tự, gồm chữ và số.</p>
              </Field>
              <Field label="Nhập lại mật khẩu" htmlFor="player-register-password-confirmation">
                <Input
                  id="player-register-password-confirmation"
                  name="passwordConfirmation"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </Field>
              {error && <p role="alert" className="text-sm leading-5 text-red-300">{error}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={pending}>
                {pending ? <LoaderCircle className="animate-spin" /> : <UserPlus />}
                {pending ? "Đang tạo tài khoản…" : "Tạo tài khoản và vào game"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-200">
        {label}
      </label>
      {children}
    </div>
  );
}
