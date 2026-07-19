"use client";

import { FormSection, NumberField } from "@/features/admin/components/form-controls";
import { asContentValue, withField } from "@/features/admin/content-value";
import type { ContentValue } from "@/features/admin/types";

export function RulesEditor({
  value,
  onChange,
  disabled,
}: {
  value: ContentValue;
  onChange: (value: ContentValue) => void;
  disabled?: boolean;
}) {
  const stats = asContentValue(value.statRules);
  const daily = asContentValue(value.dailyRules);
  const expedition = asContentValue(value.expeditionRules);
  const updateGroup = (group: string, current: ContentValue, field: string, next: number) =>
    onChange(withField(value, group, withField(current, field, next)));

  return (
    <div className="space-y-5">
      <FormSection title="Chỉ số">
        <NumberField label="Ngưỡng nguy cấp" value={stats.criticalBelow} min={1} max={100} disabled={disabled} onChange={(next) => updateGroup("statRules", stats, "criticalBelow", next)} />
      </FormSection>
      <FormSection title="Mỗi ngày">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <NumberField label="Event tối đa" value={daily.maxEventsPerDay} min={1} max={3} disabled={disabled} onChange={(next) => updateGroup("dailyRules", daily, "maxEventsPerDay", next)} />
          <NumberField label="Ambient tối đa" value={daily.maxAmbientPerDay} min={0} max={1} disabled={disabled} onChange={(next) => updateGroup("dailyRules", daily, "maxAmbientPerDay", next)} />
          <NumberField label="Tỉ lệ ambient" value={daily.ambientChance} min={0} max={1} step={0.05} disabled={disabled} onChange={(next) => updateGroup("dailyRules", daily, "ambientChance", next)} />
          <NumberField label="Food / nhân vật" value={daily.foodUnitsPerCharacter} min={0} disabled={disabled} onChange={(next) => updateGroup("dailyRules", daily, "foodUnitsPerCharacter", next)} />
          <NumberField label="Water / nhân vật" value={daily.waterUnitsPerCharacter} min={0} disabled={disabled} onChange={(next) => updateGroup("dailyRules", daily, "waterUnitsPerCharacter", next)} />
        </div>
      </FormSection>
      <FormSection title="Chuyến đi">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <NumberField label="Ô hành trang hiển thị" value={expedition.visibleLoadoutSlots} min={1} max={8} disabled={disabled} onChange={(next) => updateGroup("expeditionRules", expedition, "visibleLoadoutSlots", next)} />
          <NumberField label="Máu mất / ô" value={expedition.healthPerLostSlot} min={1} max={100} disabled={disabled} onChange={(next) => updateGroup("expeditionRules", expedition, "healthPerLostSlot", next)} />
          <NumberField label="Cooldown trở về" value={expedition.returnCooldownDays} min={0} max={30} disabled={disabled} onChange={(next) => updateGroup("expeditionRules", expedition, "returnCooldownDays", next)} />
          <NumberField label="Số ngày tối đa" value={expedition.maxDurationDays} min={1} max={30} disabled={disabled} onChange={(next) => updateGroup("expeditionRules", expedition, "maxDurationDays", next)} />
          <NumberField label="Journal tối đa" value={expedition.maxJournalEntries} min={1} max={100} disabled={disabled} onChange={(next) => updateGroup("expeditionRules", expedition, "maxJournalEntries", next)} />
        </div>
      </FormSection>
    </div>
  );
}
