import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "player" | "admin";
    } & DefaultSession["user"];
  }

  interface User {
    role: "player" | "admin";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: "player" | "admin";
  }
}
