import type { PageDto } from "@/features/admin/types";

interface ApiEnvelope<T> {
  data: T;
}

interface ApiErrorEnvelope {
  error?: { code?: string; message?: string; details?: unknown };
}

export class AdminApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

export async function adminApi<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  if (response.status === 204) return undefined as T;

  const payload = (await response.json().catch(() => ({}))) as
    | ApiEnvelope<T>
    | ApiErrorEnvelope;
  if (!response.ok) {
    const error = (payload as ApiErrorEnvelope).error;
    throw new AdminApiError(
      error?.message ?? "Yêu cầu thất bại",
      error?.code,
      error?.details,
    );
  }
  return (payload as ApiEnvelope<T>).data;
}

export async function loadAllPages<T>(url: string): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | null = null;
  do {
    const separator = url.includes("?") ? "&" : "?";
    const page: PageDto<T> = await adminApi<PageDto<T>>(
      `${url}${cursor ? `${separator}cursor=${encodeURIComponent(cursor)}` : ""}`,
    );
    all.push(...page.items);
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.nextCursor : null;
  } while (cursor);
  return all;
}
