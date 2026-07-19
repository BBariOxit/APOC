import { NextResponse } from "next/server";

import { connectToDatabase } from "@/server/db/mongoose";

export const runtime = "nodejs";

export async function GET() {
  const startedAt = performance.now();

  try {
    const mongoose = await connectToDatabase();
    const database = mongoose.connection.db;

    if (!database) {
      throw new Error("MongoDB connection has no active database");
    }

    await database.admin().ping();

    return NextResponse.json({
      status: "ok",
      checks: {
        database: "up",
      },
      latencyMs: Math.round(performance.now() - startedAt),
    });
  } catch {
    return NextResponse.json(
      {
        status: "unavailable",
        checks: {
          database: "down",
        },
      },
      { status: 503 },
    );
  }
}
