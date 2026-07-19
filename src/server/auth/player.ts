import "server-only";

import { isValidObjectId } from "mongoose";

import { auth } from "@/auth";
import { UserModel } from "@/server/db/models";
import { connectToDatabase } from "@/server/db/mongoose";
import { ApiError } from "@/server/http/api-error";

export interface PlayerPrincipal {
  userId: string;
  username: string;
  role: "player" | "admin";
}

export async function requirePlayer(): Promise<PlayerPrincipal> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !isValidObjectId(userId)) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication required");
  }

  await connectToDatabase();
  const user = await UserModel.findOne({ _id: userId, status: "active" })
    .select("username role")
    .lean()
    .exec();
  if (!user) {
    throw new ApiError(403, "FORBIDDEN", "Active player account required");
  }
  return { userId, username: user.username, role: user.role };
}
