import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const environmentPath = resolve(process.cwd(), ".env");
let environment = "";
try {
  environment = await readFile(environmentPath, "utf8");
} catch (error) {
  if (!(error instanceof Error) || !error.message.includes("ENOENT")) {
    throw error;
  }
}

const existing = environment.match(/^AUTH_SECRET=(.*)$/m)?.[1]?.trim();
if (existing) {
  process.stdout.write("AUTH_SECRET is already configured; no changes made.\n");
  process.exit(0);
}

const secretLine = `AUTH_SECRET=${randomBytes(48).toString("base64url")}`;
const nextEnvironment = /^AUTH_SECRET=.*$/m.test(environment)
  ? environment.replace(/^AUTH_SECRET=.*$/m, secretLine)
  : `${environment.trimEnd()}${environment ? "\n\n" : ""}${secretLine}\n`;

await writeFile(environmentPath, nextEnvironment, {
  encoding: "utf8",
  mode: 0o600,
});
process.stdout.write("AUTH_SECRET generated in .env without printing its value.\n");
