"use client";

import {
  ArrayHeader,
  NumberField,
  RemoveButton,
  SelectField,
  TextField,
} from "@/features/admin/components/form-controls";
import { EffectListBuilder } from "@/features/admin/components/effect-builder";
import { OptionalRuleBuilder } from "@/features/admin/components/rule-builder";
import { asContentArray, asContentValue, removeAt, replaceAt, withField } from "@/features/admin/content-value";
import type { ContentCatalogDto, ContentValue } from "@/features/admin/types";

export function defaultResolution(): ContentValue {
  return {
    mode: "deterministic",
    title: "Kết quả",
    description: "Mô tả kết quả",
    effects: [],
  };
}

function defaultOutcome(index: number): ContentValue {
  return {
    key: `outcome_${index + 1}`,
    weight: 1,
    title: `Kết quả ${index + 1}`,
    description: "Mô tả kết quả",
    effects: [],
  };
}

export function ResolutionBuilder({
  value,
  onChange,
  catalog,
  disabled,
}: {
  value: unknown;
  onChange: (value: ContentValue) => void;
  catalog: ContentCatalogDto;
  disabled?: boolean;
}) {
  const resolution = asContentValue(value);
  const mode = String(resolution.mode ?? "deterministic");
  const outcomes = asContentArray(resolution.outcomes);

  return (
    <div className="space-y-3 rounded-lg border border-white/8 bg-zinc-900/35 p-3">
      <SelectField
        label="Resolution"
        value={mode}
        disabled={disabled}
        onChange={(next) =>
          onChange(
            next === "weighted"
              ? { mode: "weighted", outcomes: [defaultOutcome(0), defaultOutcome(1)] }
              : defaultResolution(),
          )
        }
        options={[
          { value: "deterministic", label: "Cố định" },
          { value: "weighted", label: "Theo trọng số" },
        ]}
      />

      {mode === "deterministic" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Tiêu đề kết quả" value={resolution.title} disabled={disabled} onChange={(next) => onChange(withField(resolution, "title", next))} />
            <TextField label="Mô tả" value={resolution.description} disabled={disabled} multiline onChange={(next) => onChange(withField(resolution, "description", next))} />
          </div>
          <EffectListBuilder value={resolution.effects} catalog={catalog} disabled={disabled} onChange={(next) => onChange(withField(resolution, "effects", next))} />
        </>
      ) : (
        <div className="space-y-3">
          <ArrayHeader label="Outcomes" disabled={disabled || outcomes.length >= 16} onAdd={() => onChange(withField(resolution, "outcomes", [...outcomes, defaultOutcome(outcomes.length)]))} />
          {outcomes.map((outcome, index) => (
            <div key={index} className="space-y-3 rounded-lg border border-white/8 bg-zinc-950/45 p-3">
              <div className="flex items-end gap-2">
                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[1fr_100px]">
                  <TextField label="Outcome key" value={outcome.key} disabled={disabled} onChange={(next) => onChange(withField(resolution, "outcomes", replaceAt(outcomes, index, withField(outcome, "key", next))))} />
                  <NumberField label="Weight" value={outcome.weight} min={1} disabled={disabled} onChange={(next) => onChange(withField(resolution, "outcomes", replaceAt(outcomes, index, withField(outcome, "weight", next))))} />
                </div>
                {outcomes.length > 2 && <RemoveButton disabled={disabled} onClick={() => onChange(withField(resolution, "outcomes", removeAt(outcomes, index)))} />}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Tiêu đề" value={outcome.title} disabled={disabled} onChange={(next) => onChange(withField(resolution, "outcomes", replaceAt(outcomes, index, withField(outcome, "title", next))))} />
                <TextField label="Mô tả" value={outcome.description} disabled={disabled} multiline onChange={(next) => onChange(withField(resolution, "outcomes", replaceAt(outcomes, index, withField(outcome, "description", next))))} />
              </div>
              <OptionalRuleBuilder label="Điều kiện outcome" value={outcome.requirements} catalog={catalog} disabled={disabled} onChange={(next) => onChange(withField(resolution, "outcomes", replaceAt(outcomes, index, withField(outcome, "requirements", next))))} />
              <EffectListBuilder value={outcome.effects} catalog={catalog} disabled={disabled} onChange={(next) => onChange(withField(resolution, "outcomes", replaceAt(outcomes, index, withField(outcome, "effects", next))))} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
