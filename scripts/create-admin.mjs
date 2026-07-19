import { loadEnvConfig } from "@next/env";
import { hash } from "bcryptjs";
import mongoose from "mongoose";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

loadEnvConfig(process.cwd());

function normalizeUsernameKey(value) {
  return value.trim().normalize("NFKC").toLocaleLowerCase("en-US");
}

async function readHidden(prompt) {
  if (!input.isTTY || typeof input.setRawMode !== "function") {
    throw new Error("An interactive terminal is required to enter the password safely");
  }

  output.write(prompt);
  input.setRawMode(true);
  input.resume();
  input.setEncoding("utf8");

  return new Promise((resolve, reject) => {
    let value = "";
    function cleanup() {
      input.setRawMode(false);
      input.pause();
      input.removeListener("data", onData);
      output.write("\n");
    }
    function onData(character) {
      if (character === "\r" || character === "\n") {
        cleanup();
        resolve(value);
        return;
      }
      if (character === "\u0003") {
        cleanup();
        reject(new Error("Cancelled"));
        return;
      }
      if (character === "\u007f" || character === "\b") {
        value = value.slice(0, -1);
        return;
      }
      if (/^[\x20-\x7E]$/.test(character)) {
        value += character;
      }
    }
    input.on("data", onData);
  });
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
  if (
    password.length < 12 ||
    password.length > 128 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error(
      "Password must be 12-128 chars and contain lower, upper, number and symbol",
    );
  }
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
