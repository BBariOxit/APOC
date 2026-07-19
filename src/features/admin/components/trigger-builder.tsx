"use client";

import { NumberField, SelectField } from "@/features/admin/components/form-controls";
import { asContentValue, withField } from "@/features/admin/content-value";
import type { ContentValue } from "@/features/admin/types";

export function TriggerBuilder({
  value,
  onChange,
  ambient,
  expedition,
  disabled,
}: {
  value: unknown;
  onChange: (value: ContentValue) => void;
  ambient?: boolean;
  expedition?: boolean;
  disabled?: boolean;
}) {
  const trigger = asContentValue(value);
  const mode = String(trigger.mode ?? "random");
  const modes = ambient
    ? ["random", "fixed_day", "scheduled"]
    : expedition
      ? ["location_pool"]
      : ["random", "fixed_day", "scheduled", "chained", "manual"];
  const changeMode = (next: string) => {
    if (next === "fixed_day") {
      onChange({ mode: next, fixedDay: 1, maxOccurrences: 1, cooldownDays: 0 });
      return;
    }
    if (["random", "scheduled", "chained"].includes(next)) {
      onChange({ mode: next, minDay: 1, maxDay: 30, maxOccurrences: 1, cooldownDays: 0 });
      return;
    }
    onChange({ mode: next, maxOccurrences: 1, cooldownDays: 0 });
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <SelectField label="Trigger" value={mode} disabled={disabled} onChange={changeMode} options={modes.map((item) => ({ value: item, label: item }))} />
      {mode === "fixed_day" && <NumberField label="Ngày cố định" value={trigger.fixedDay ?? 1} min={1} disabled={disabled} onChange={(next) => onChange(withField(trigger, "fixedDay", next))} />}
      {!(["fixed_day", "manual", "location_pool"] as string[]).includes(mode) && <><NumberField label="Từ ngày" value={trigger.minDay ?? 1} min={1} disabled={disabled} onChange={(next) => onChange(withField(trigger, "minDay", next))} /><NumberField label="Đến ngày" value={trigger.maxDay ?? 30} min={1} disabled={disabled} onChange={(next) => onChange(withField(trigger, "maxDay", next))} /></>}
      <NumberField label="Số lần tối đa" value={trigger.maxOccurrences ?? 1} min={1} disabled={disabled} onChange={(next) => onChange(withField(trigger, "maxOccurrences", next))} />
      <NumberField label="Cooldown ngày" value={trigger.cooldownDays ?? 0} min={0} disabled={disabled} onChange={(next) => onChange(withField(trigger, "cooldownDays", next))} />
    </div>
  );
}
