import "server-only";

import { z } from "zod";

export const normalizedEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .max(320);

export const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[\p{L}\p{N}_-]+$/u);

export function normalizeUsernameKey(username: string): string {
  return username.trim().normalize("NFKC").toLocaleLowerCase("en-US");
}

export const usernameKeySchema = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[\p{L}\p{N}_-]+$/u);

export const passwordHashSchema = z.string().min(20).max(255);

export const playerPasswordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[\p{L}]/u, "password must contain a letter")
  .regex(/[\p{N}]/u, "password must contain a number");

export const registerAccountSchema = z
  .object({
    email: normalizedEmailSchema,
    username: usernameSchema,
    password: playerPasswordSchema,
  })
  .strict();
