import nextEnv from "@next/env";
import { hash } from "bcryptjs";
import mongoose from "mongoose";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { assertStrongPassword, readHidden } from "./admin-password.mjs";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

function normalizeUsernameKey(value) {
  return value.trim().normalize("NFKC").toLocaleLowerCase("en-US");
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured");
  }

  const readline = createInterface({ input, output });
  const email = (await readline.question("Admin email: ")).trim().toLowerCase();
  const username = (await readline.question("Admin username: ")).trim();
  readline.close();
  const password = await readHidden("Admin password (12+ chars): ");
  const confirmation = await readHidden("Confirm password: ");

  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 320) {
    throw new Error("Email is invalid");
  }
  if (!/^[\p{L}\p{N}_-]{3,32}$/u.test(username)) {
    throw new Error("Username must be 3-32 letters, numbers, underscores or hyphens");
  }
  assertStrongPassword(password);
  if (password !== confirmation) {
    throw new Error("Passwords do not match");
  }

  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  const users = mongoose.connection.collection("users");
  const usernameKey = normalizeUsernameKey(username);
  const existing = await users.findOne({
    $or: [{ email }, { usernameKey }],
  });
  if (existing) {
    throw new Error("A user already exists with that email or username");
  }

  const now = new Date();
  await users.insertOne({
    email,
    username,
    usernameKey,
    passwordHash: await hash(password, 12),
    role: "admin",
    status: "active",
    createdAt: now,
    updatedAt: now,
    __v: 0,
  });
  await users.createIndex({ email: 1 }, { unique: true });
  await users.createIndex({ usernameKey: 1 }, { unique: true });
  output.write(`Admin ${username} created successfully.\n`);
}

main()
  .catch((error) => {
    output.write(`Failed: ${error instanceof Error ? error.message : "Unknown error"}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
