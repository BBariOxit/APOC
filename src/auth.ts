import "server-only";

import { compare, hashSync } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { connectToDatabase } from "@/server/db/mongoose";
import { UserModel } from "@/server/db/models";
import {
  clearLoginFailures,
  isLoginBlocked,
  recordLoginFailure,
} from "@/server/auth/login-rate-limit";
import { normalizeUsernameKey } from "@/server/validation/account";

const credentialsSchema = z
  .object({
    identifier: z.string().trim().min(3).max(320),
    password: z.string().min(8).max(128),
  })
  .strict();

const dummyPasswordHash = hashSync("apoc-invalid-password", 12);

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost:
    process.env.NODE_ENV !== "production" ||
    process.env.AUTH_TRUST_HOST === "true",
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Email hoặc username", type: "text" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse({
          identifier: credentials?.identifier,
          password: credentials?.password,
        });
        if (!parsed.success) {
          return null;
        }

        await connectToDatabase();

        const identifier = parsed.data.identifier.toLowerCase();
        if (await isLoginBlocked(identifier, request)) {
          return null;
        }
        const query = identifier.includes("@")
          ? { email: identifier }
          : { usernameKey: normalizeUsernameKey(identifier) };
        const user = await UserModel.findOne(query)
          .select("+passwordHash username email role status")
          .exec();

        const passwordMatches = await compare(
          parsed.data.password,
          user?.passwordHash ?? dummyPasswordHash,
        );

        if (!user || !passwordMatches || user.status !== "active") {
          await recordLoginFailure(identifier, request);
          return null;
        }

        await clearLoginFailures(identifier);

        await UserModel.updateOne(
          { _id: user._id, status: "active" },
          { $set: { lastLoginAt: new Date() } },
        ).exec();

        return {
          id: user._id.toString(),
          name: user.username,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.userId ?? "");
        session.user.role = token.role === "admin" ? "admin" : "player";
      }
      return session;
    },
  },
});
