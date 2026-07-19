import "server-only";

import { isValidObjectId } from "mongoose";

import { auth } from "@/auth";
import { ApiError } from "@/server/http/api-error";
import { connectToDatabase } from "@/server/db/mongoose";
import { UserModel } from "@/server/db/models";

export interface AdminPrincipal {
  userId: string;
  username: string;
}

export async function requireAdmin(): Promise<AdminPrincipal> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId || !isValidObjectId(userId)) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication required");
  }

  await connectToDatabase();
  const user = await UserModel.findOne({
    _id: userId,
    role: "admin",
    status: "active",
  })
    .select("username")
    .lean()
    .exec();

  if (!user) {
    throw new ApiError(403, "FORBIDDEN", "Administrator access required");
  }

  return { userId, username: user.username };
}
