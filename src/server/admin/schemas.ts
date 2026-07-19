import "server-only";

import { z } from "zod";

import { contentKeySchema } from "@/server/validation/content";

export const semverSchema = z
  .string()
  .trim()
  .regex(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/,
    "version must be valid semantic versioning",
  );

export const createVersionRequestSchema = z
  .object({
    version: semverSchema,
    changelog: z.string().max(10_000).default(""),
    cloneFromVersionId: z.string().optional(),
  })
  .strict();

export const updateVersionRequestSchema = z
  .object({
    version: semverSchema.optional(),
    changelog: z.string().max(10_000).optional(),
    expectedVersion: z.number().int().min(0),
  })
  .strict()
  .refine(({ version, changelog }) => version !== undefined || changelog !== undefined, {
    message: "at least one editable field is required",
  });

export const createContentRequestSchema = z
  .object({
    key: contentKeySchema,
    enabled: z.boolean().default(true),
    content: z.unknown(),
  })
  .strict();

export const updateContentRequestSchema = z
  .object({
    enabled: z.boolean().optional(),
    content: z.unknown().optional(),
    expectedVersion: z.number().int().min(0),
  })
  .strict()
  .refine(
    ({ enabled, content }) => enabled !== undefined || content !== undefined,
    { message: "enabled or content is required" },
  );

export const duplicateContentRequestSchema = z
  .object({
    key: contentKeySchema,
    enabled: z.boolean().default(false),
  })
  .strict();

export const bulkContentRequestSchema = z
  .object({
    keys: z.array(contentKeySchema).min(1).max(100),
    action: z.enum(["enable", "disable"]),
  })
  .strict()
  .refine(({ keys }) => new Set(keys).size === keys.length, {
    message: "keys must be unique",
  });

export const updateRulesRequestSchema = z
  .object({
    content: z.unknown(),
    expectedVersion: z.number().int().min(0).optional(),
  })
  .strict();
