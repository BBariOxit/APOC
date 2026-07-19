import "server-only";

import { createHmac } from "node:crypto";

import { connectToDatabase } from "@/server/db/mongoose";

const maximumFailures = 5;
const windowMilliseconds = 15 * 60 * 1000;

interface AuthRateLimitDocument {
  key: string;
  failures: number;
  blockedUntil?: Date;
  expiresAt: Date;
}

declare global {
  var apocAuthRateLimitIndexes: Promise<unknown> | undefined;
}

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  ).slice(0, 128);
}

function digest(value: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required for authentication");
  }
  return createHmac("sha256", secret).update(value).digest("hex");
}

function keys(identifier: string, request: Request): string[] {
  return [
    digest(`identifier:${identifier.toLowerCase()}`),
    digest(`ip:${clientIp(request)}`),
  ];
}

async function collection() {
  const mongoose = await connectToDatabase();
  const target = mongoose.connection.collection<AuthRateLimitDocument>(
    "auth_rate_limits",
  );
  globalThis.apocAuthRateLimitIndexes ??= Promise.all([
    target.createIndex({ key: 1 }, { unique: true }),
    target.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
  await globalThis.apocAuthRateLimitIndexes;
  return target;
}

export async function isLoginBlocked(
  identifier: string,
  request: Request,
): Promise<boolean> {
  const target = await collection();
  const now = new Date();
  return Boolean(
    await target.findOne({
      key: { $in: keys(identifier, request) },
      blockedUntil: { $gt: now },
    }),
  );
}

export async function recordLoginFailure(
  identifier: string,
  request: Request,
): Promise<void> {
  const target = await collection();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMilliseconds);
  const blockedUntil = expiresAt;

  await target.bulkWrite(
    keys(identifier, request).map((key) => ({
      updateOne: {
        filter: { key },
        update: [
          {
            $set: {
              key,
              failures: {
                $cond: [
                  { $gt: ["$expiresAt", now] },
                  { $add: [{ $ifNull: ["$failures", 0] }, 1] },
                  1,
                ],
              },
              expiresAt,
            },
          },
          {
            $set: {
              blockedUntil: {
                $cond: [
                  { $gte: ["$failures", maximumFailures] },
                  blockedUntil,
                  "$blockedUntil",
                ],
              },
            },
          },
        ],
        upsert: true,
      },
    })),
  );
}

export async function clearLoginFailures(
  identifier: string,
  request: Request,
): Promise<void> {
  const target = await collection();
  await target.deleteMany({ key: { $in: keys(identifier, request) } });
}
