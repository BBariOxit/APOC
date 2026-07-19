import type { ContentValue } from "@/features/admin/types";

export function asContentValue(value: unknown): ContentValue {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ContentValue)
    : {};
}

export function asContentArray(value: unknown): ContentValue[] {
  return Array.isArray(value) ? value.map(asContentValue) : [];
}

export function withField(
  value: ContentValue,
  field: string,
  next: unknown,
): ContentValue {
  if (next === undefined || next === "") {
    const copy = { ...value };
    delete copy[field];
    return copy;
  }
  return { ...value, [field]: next };
}

export function replaceAt<T>(values: T[], index: number, next: T): T[] {
  return values.map((value, current) => (current === index ? next : value));
}

export function removeAt<T>(values: T[], index: number): T[] {
  return values.filter((_, current) => current !== index);
}
