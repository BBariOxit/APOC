"use client";

import {
  ArrayHeader,
  FormSection,
  NumberField,
  ReferenceField,
  ReferenceListField,
  RemoveButton,
} from "@/features/admin/components/form-controls";
import {
  asContentArray,
  asContentValue,
  removeAt,
  replaceAt,
  withField,
} from "@/features/admin/content-value";
import type { ContentCatalogDto, ContentValue } from "@/features/admin/types";

export function RulesEditor({
  value,
  onChange,
  catalog,
  disabled,
}: {
  value: ContentValue;
  onChange: (value: ContentValue) => void;
  catalog: ContentCatalogDto;
  disabled?: boolean;
}) {
  const setup = asContentValue(value.runSetup);
  const inventory = asContentArray(setup.inventory);
  const stats = asContentValue(value.statRules);
  const daily = asContentValue(value.dailyRules);
  const expedition = asContentValue(value.expeditionRules);

  const updateGroup = (
    group: string,
    current: ContentValue,
    field: string,
    next: number,
  ) => onChange(withField(value, group, withField(current, field, next)));
  const updateSetup = (field: string, next: unknown) =>
    onChange(withField(value, "runSetup", withField(setup, field, next)));

  return (
    <div className="space-y-5">
      <FormSection title="Khởi tạo ván">
        <ReferenceListField
          label="4 nhân vật khởi đầu"
          value={setup.characterKeys}
          items={catalog.characters}
          disabled={
            disabled ||
            (Array.isArray(setup.characterKeys) && setup.characterKeys.length >= 4)
          }
          onChange={(next) => updateSetup("characterKeys", next)}
        />
        <div className="space-y-2">
          <ArrayHeader
            label="Kho đồ khởi đầu"
            disabled={disabled || inventory.length >= 64}
            onAdd={() => {
              const used = new Set(
                inventory.map((entry) => String(entry.itemKey ?? "")),
              );
              const itemKey = catalog.items.find(
                (item) => !used.has(item.key),
              )?.key;
              if (!itemKey) return;
              updateSetup("inventory", [
                ...inventory,
                { itemKey, intactQuantity: 1, brokenQuantity: 0 },
              ]);
            }}
          />
          {inventory.map((entry, index) => (
            <div
              key={`${String(entry.itemKey)}:${index}`}
              className="grid gap-2 rounded-lg border border-white/8 bg-zinc-950/40 p-3 sm:grid-cols-[minmax(0,1fr)_120px_120px_auto]"
            >
              <ReferenceField
                label="Vật phẩm"
                value={entry.itemKey}
                items={catalog.items.filter(
                  (item) =>
                    item.key === entry.itemKey ||
                    !inventory.some(
                      (candidate) => candidate.itemKey === item.key,
                    ),
                )}
                disabled={disabled}
                onChange={(next) =>
                  updateSetup(
                    "inventory",
                    replaceAt(
                      inventory,
                      index,
                      withField(entry, "itemKey", next),
                    ),
                  )
                }
              />
              <NumberField
                label="Nguyên vẹn"
                value={entry.intactQuantity}
                min={0}
                disabled={disabled}
                onChange={(next) =>
                  updateSetup(
                    "inventory",
                    replaceAt(
                      inventory,
                      index,
                      withField(entry, "intactQuantity", next),
                    ),
                  )
                }
              />
              <NumberField
                label="Bị hỏng"
                value={entry.brokenQuantity}
                min={0}
                disabled={disabled}
                onChange={(next) =>
                  updateSetup(
                    "inventory",
                    replaceAt(
                      inventory,
                      index,
                      withField(entry, "brokenQuantity", next),
                    ),
                  )
                }
              />
              <div className="flex items-end">
                <RemoveButton
                  disabled={disabled}
                  onClick={() =>
                    updateSetup("inventory", removeAt(inventory, index))
                  }
                />
              </div>
            </div>
          ))}
          {inventory.length === 0 && (
            <p className="text-xs text-zinc-600">Chưa có vật phẩm khởi đầu.</p>
          )}
        </div>
      </FormSection>

      <FormSection title="Chỉ số">
        <NumberField
          label="Ngưỡng nguy cấp"
          value={stats.criticalBelow}
          min={1}
          max={100}
          disabled={disabled}
          onChange={(next) =>
            updateGroup("statRules", stats, "criticalBelow", next)
          }
        />
      </FormSection>

      <FormSection title="Mỗi ngày">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <NumberField label="Event tối đa" value={daily.maxEventsPerDay} min={1} max={3} disabled={disabled} onChange={(next) => updateGroup("dailyRules", daily, "maxEventsPerDay", next)} />
          <NumberField label="Ambient tối đa" value={daily.maxAmbientPerDay} min={0} max={1} disabled={disabled} onChange={(next) => updateGroup("dailyRules", daily, "maxAmbientPerDay", next)} />
          <NumberField label="Tỉ lệ ambient" value={daily.ambientChance} min={0} max={1} step={0.05} disabled={disabled} onChange={(next) => updateGroup("dailyRules", daily, "ambientChance", next)} />
          <NumberField label="Food / nhân vật" value={daily.foodUnitsPerCharacter} min={0} disabled={disabled} onChange={(next) => updateGroup("dailyRules", daily, "foodUnitsPerCharacter", next)} />
          <NumberField label="Water / nhân vật" value={daily.waterUnitsPerCharacter} min={0} disabled={disabled} onChange={(next) => updateGroup("dailyRules", daily, "waterUnitsPerCharacter", next)} />
          <NumberField label="Mất dinh dưỡng khi thiếu ăn" value={daily.hungerStatLoss} min={0} max={100} disabled={disabled} onChange={(next) => updateGroup("dailyRules", daily, "hungerStatLoss", next)} />
          <NumberField label="Mất nước khi thiếu uống" value={daily.thirstStatLoss} min={0} max={100} disabled={disabled} onChange={(next) => updateGroup("dailyRules", daily, "thirstStatLoss", next)} />
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
