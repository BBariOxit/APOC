import nextEnv from "@next/env";
import { compare, hash } from "bcryptjs";
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
  const identifier = (await readline.question("Admin email or username: ")).trim();
  readline.close();
  if (!identifier) throw new Error("Admin email or username is required");

  const password = await readHidden("New admin password (12+ chars): ");
  const confirmation = await readHidden("Confirm password: ");
  assertStrongPassword(password);
  if (password !== confirmation) throw new Error("Passwords do not match");

  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  const users = mongoose.connection.collection("users");
  const query = identifier.includes("@")
    ? { email: identifier.toLowerCase() }
    : { usernameKey: normalizeUsernameKey(identifier) };
  const user = await users.findOne(query, {
    projection: { username: 1, role: 1, status: 1 },
  });

  if (!user || user.role !== "admin") {
    throw new Error("Admin account was not found");
  }
  if (user.status !== "active") {
    throw new Error("Admin account is not active");
  }

  const passwordHash = await hash(password, 12);
  if (!(await compare(password, passwordHash))) {
    throw new Error("Password verification failed before update");
  }

  const result = await users.updateOne(
    { _id: user._id, role: "admin", status: "active" },
    { $set: { passwordHash, updatedAt: new Date() } },
  );
  if (result.modifiedCount !== 1) {
    throw new Error("Admin password was not updated");
  }

  output.write(`Password for admin ${user.username} updated successfully.\n`);
}

main()
  .catch((error) => {
    output.write(`Failed: ${error instanceof Error ? error.message : "Unknown error"}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
