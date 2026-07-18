import "server-only";

import mongoose, { type Mongoose } from "mongoose";

interface MongooseCache {
  connection: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

declare global {
  var apocMongooseCache: MongooseCache | undefined;
}

const cache = globalThis.apocMongooseCache ?? {
  connection: null,
  promise: null,
};

globalThis.apocMongooseCache = cache;

export async function connectToDatabase(): Promise<Mongoose> {
  if (cache.connection) {
    return cache.connection;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is not configured. Add it to a root .env.local file.",
    );
  }

  cache.promise ??= mongoose.connect(uri, {
    bufferCommands: false,
  });

  try {
    cache.connection = await cache.promise;
    return cache.connection;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
}
