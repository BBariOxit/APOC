import { hash } from "bcryptjs";
import { mongo } from "mongoose";

import { PlayerProfileModel, UserModel } from "@/server/db/models";
import { connectToDatabase } from "@/server/db/mongoose";
import {
  errorResponse,
  jsonCreated,
  readJson,
} from "@/server/http/route-handler";
import { ApiError } from "@/server/http/api-error";
import {
  normalizeUsernameKey,
  registerAccountSchema,
} from "@/server/validation/account";

export async function POST(request: Request) {
  try {
    const input = registerAccountSchema.parse(await readJson(request));
    const mongoose = await connectToDatabase();
    const usernameKey = normalizeUsernameKey(input.username);

    const existing = await UserModel.findOne({
      $or: [{ email: input.email }, { usernameKey }],
    })
      .select("email usernameKey")
      .lean()
      .exec();

    if (existing) {
      throw new ApiError(
        409,
        "ACCOUNT_EXISTS",
        existing.email === input.email
          ? "Email này đã được sử dụng."
          : "Tên người chơi này đã được sử dụng.",
      );
    }

    const session = await mongoose.startSession();
    let account: { id: string; email: string; username: string } | undefined;

    try {
      await session.withTransaction(async () => {
        const [user] = await UserModel.create(
          [
            {
              email: input.email,
              username: input.username,
              usernameKey,
              passwordHash: await hash(input.password, 12),
              role: "player",
              status: "active",
            },
          ],
          { session },
        );

        await PlayerProfileModel.create([{ userId: user._id }], { session });
        account = {
          id: user._id.toString(),
          email: user.email,
          username: user.username,
        };
      });
    } finally {
      await session.endSession();
    }

    if (!account) {
      throw new Error("Account transaction completed without a user");
    }

    return jsonCreated(account);
  } catch (error) {
    if (error instanceof mongo.MongoServerError && error.code === 11000) {
      return errorResponse(
        new ApiError(
          409,
          "ACCOUNT_EXISTS",
          "Email hoặc tên người chơi đã được sử dụng.",
        ),
      );
    }
    return errorResponse(error);
  }
}
