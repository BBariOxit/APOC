import "server-only";

import { NextResponse } from "next/server";
import { isValidObjectId, mongo, Error as MongooseError } from "mongoose";
import { ZodError } from "zod";

import { requireAdmin, type AdminPrincipal } from "@/server/auth/admin";
import { ApiError } from "@/server/http/api-error";

export type AdminRouteHandler<TContext = unknown> = (
  admin: AdminPrincipal,
  context: TContext,
) => Promise<Response>;

export function assertObjectId(value: string, field = "id"): void {
  if (!isValidObjectId(value)) {
    throw new ApiError(400, "VALIDATION_ERROR", `${field} is invalid`);
  }
}

export function assertMutationRequest(request: Request): void {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0];
  if (contentType !== "application/json") {
    throw new ApiError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Content-Type must be application/json",
    );
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new ApiError(403, "INVALID_ORIGIN", "Cross-origin mutation denied");
  }
}

export async function readJson(request: Request): Promise<unknown> {
  assertMutationRequest(request);
  const maximumBytes = 1024 * 1024;
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body exceeds 1 MB");
  }
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maximumBytes) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body exceeds 1 MB");
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body is not valid JSON");
  }
}

export function jsonCreated(data: unknown): Response {
  return NextResponse.json({ data }, { status: 201 });
}

export function jsonOk(data: unknown, init?: ResponseInit): Response {
  return NextResponse.json({ data }, init);
}

export function jsonNoContent(): Response {
  return new Response(null, { status: 204 });
}

function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: error.flatten(),
        },
      },
      { status: 400 },
    );
  }

  if (error instanceof MongooseError.ValidationError) {
    const details = Object.fromEntries(
      Object.entries(error.errors).map(([path, issue]) => [
        path,
        issue.message,
      ]),
    );
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Content validation failed",
          details,
        },
      },
      { status: 400 },
    );
  }

  if (error instanceof mongo.MongoServerError && error.code === 11000) {
    return NextResponse.json(
      {
        error: {
          code: "DUPLICATE_KEY",
          message: "A record with this key already exists",
        },
      },
      { status: 409 },
    );
  }

  console.error(
    "Unhandled API error",
    error instanceof Error ? { name: error.name, message: error.message } : {},
  );
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    },
    { status: 500 },
  );
}

export async function withAdmin<TContext>(
  context: TContext,
  handler: AdminRouteHandler<TContext>,
): Promise<Response> {
  try {
    const admin = await requireAdmin();
    return await handler(admin, context);
  } catch (error) {
    return errorResponse(error);
  }
}
