"use client";

import { Plus, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CatalogItemDto } from "@/features/admin/types";
import { cn } from "@/lib/utils";

export const inputClass =
  "h-8 w-full rounded-lg border border-input bg-zinc-950/70 px-2.5 text-sm outline-none focus:border-zinc-500 disabled:opacity-50";

export function FormSection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3 border-t border-white/8 pt-4 first:border-0 first:pt-0", className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block min-w-0 space-y-1.5", className)}>
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  disabled,
  multiline,
  placeholder,
  type = "text",
}: {
  label: string;
  value: unknown;
  onChange: (value: string) => void;
  disabled?: boolean;
  multiline?: boolean;
  placeholder?: string;
  type?: "text" | "url";
}) {
  return (
    <Field label={label}>
      {multiline ? (
        <Textarea
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="min-h-20 resize-y bg-zinc-950/70"
        />
      ) : (
        <Input
          type={type}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          placeholder={placeholder}
        />
      )}
    </Field>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  disabled,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: unknown;
  onChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        value={typeof value === "number" ? value : 0}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </Field>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: unknown;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <Field label={label}>
      <select
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={inputClass}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function ReferenceField({
  label,
  value,
  onChange,
  items,
  disabled,
  allowEmpty = false,
}: {
  label: string;
  value: unknown;
  onChange: (value: string) => void;
  items: CatalogItemDto[];
  disabled?: boolean;
  allowEmpty?: boolean;
}) {
  const current = String(value ?? "");
  const exists = items.some(({ key }) => key === current);
  return (
    <Field label={label}>
      <select
        value={current}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={inputClass}
      >
        {!current && !allowEmpty && <option value="">Chọn…</option>}
        {allowEmpty && <option value="">—</option>}
        {!exists && current && <option value={current}>{current} · missing</option>}
        {items.map((item) => (
          <option key={item.key} value={item.key}>
            {item.name || item.key}{item.enabled ? "" : " · disabled"}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function ReferenceListField({
  label,
  value,
  onChange,
  items,
  disabled,
}: {
  label: string;
  value: unknown;
  onChange: (value: string[]) => void;
  items: CatalogItemDto[];
  disabled?: boolean;
}) {
  const values = Array.isArray(value) ? value.map(String) : [];
  const available = items.filter(({ key }) => !values.includes(key));
  const [candidate, setCandidate] = useState("");
  const selectedCandidate = available.some(({ key }) => key === candidate)
    ? candidate
    : (available[0]?.key ?? "");

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      <div className="flex gap-2">
        <select
          value={selectedCandidate}
          onChange={(event) => setCandidate(event.target.value)}
          disabled={disabled || available.length === 0}
          className={inputClass}
        >
          {available.length === 0 && <option value="">Không còn mục</option>}
          {available.map((item) => (
            <option key={item.key} value={item.key}>
              {item.name || item.key}{item.enabled ? "" : " · disabled"}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="icon"
          variant="outline"
          disabled={disabled || !selectedCandidate}
          onClick={() => {
            onChange([...values, selectedCandidate]);
            setCandidate("");
          }}
          aria-label={`Thêm ${label.toLowerCase()}`}
        >
          <Plus />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((key) => {
            const item = items.find((candidateItem) => candidateItem.key === key);
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
              >
                {item?.name || key}
                <button
                  type="button"
                  onClick={() => onChange(values.filter((valueKey) => valueKey !== key))}
                  disabled={disabled}
                  className="text-zinc-600 hover:text-zinc-200 disabled:opacity-50"
                  aria-label={`Bỏ ${key}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ToggleField({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex h-8 items-center gap-2 text-sm text-zinc-300">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
        disabled={disabled}
      />
      {label}
    </label>
  );
}

export function TagsField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: unknown;
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  const tags = Array.isArray(value) ? value.map(String) : [];
  const [candidate, setCandidate] = useState("");
  const addTag = () => {
    const tag = candidate.trim().toLowerCase();
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
    setCandidate("");
  };
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      <div className="flex gap-2">
        <Input
          value={candidate}
          disabled={disabled}
          placeholder="snake_case_tag"
          onChange={(event) => setCandidate(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            addTag();
          }}
        />
        <Button type="button" size="icon" variant="outline" onClick={addTag} disabled={disabled || !candidate.trim()} aria-label={`Thêm ${label.toLowerCase()}`}>
          <Plus />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-300">
              {tag}
              <button type="button" disabled={disabled} onClick={() => onChange(tags.filter((current) => current !== tag))} className="text-zinc-600 hover:text-zinc-200 disabled:opacity-50" aria-label={`Bỏ ${tag}`}>
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ArrayHeader({
  label,
  onAdd,
  disabled,
}: {
  label: string;
  onAdd: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      <Button type="button" size="xs" variant="outline" onClick={onAdd} disabled={disabled}>
        <Plus /> Thêm
      </Button>
    </div>
  );
}

export function RemoveButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      type="button"
      size="icon-xs"
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      aria-label="Xoá"
    >
      <X />
    </Button>
  );
}
