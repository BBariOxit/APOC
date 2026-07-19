import "server-only";

import { z } from "zod";

import { contentKeySchema } from "@/server/validation/content";

const commandBaseSchema = z
  .object({
    commandId: z.string().uuid(),
    expectedRevision: z.number().int().min(0),
  })
  .strict();

export const createRunRequestSchema = z
  .object({ mode: z.literal("normal").default("normal") })
  .strict();

export const advanceDayRequestSchema = commandBaseSchema;

export const resolveEventRequestSchema = commandBaseSchema.extend({
  intentKey: z.union([
    contentKeySchema,
    z.literal("fallback"),
    z.string().regex(/^item:[a-z0-9]+(?:_[a-z0-9]+)*$/),
  ]),
});
