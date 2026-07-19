"use client";

import {
  ArrayHeader,
  NumberField,
  ReferenceField,
  RemoveButton,
  SelectField,
  TextField,
  ToggleField,
} from "@/features/admin/components/form-controls";
import { OptionalRuleBuilder } from "@/features/admin/components/rule-builder";
import { defaultResolution, ResolutionBuilder } from "@/features/admin/components/resolution-builder";
import { asContentArray, asContentValue, removeAt, replaceAt, withField } from "@/features/admin/content-value";
import type { ContentCatalogDto, ContentValue } from "@/features/admin/types";

function defaultChoice(index: number): ContentValue {
  return {
    key: `choice_${index + 1}`,
    label: `Lựa chọn ${index + 1}`,
    resolution: defaultResolution(),
  };
}

function defaultItemBranch(index: number): ContentValue {
  return {
    key: `item_branch_${index + 1}`,
    itemKey: "",
    quantity: 1,
    priority: index,
    resolution: defaultResolution(),
  };
}

export function InteractionBuilder({
  value,
  onChange,
  catalog,
  delivery = "pending",
  disabled,
}: {
  value: unknown;
  onChange: (value: ContentValue) => void;
  catalog: ContentCatalogDto;
  delivery?: "pending" | "expedition";
  disabled?: boolean;
}) {
  const interaction = asContentValue(value);
  const mode = String(interaction.mode ?? "choices");
  const choices = asContentArray(interaction.choices);
  const branches = asContentArray(interaction.itemBranches);

  return (
    <div className="space-y-3">
      <SelectField
        label="Interaction"
        value={mode}
        disabled={disabled}
        onChange={(next) => {
          if (next === "choices") onChange({ mode: next, choices: [defaultChoice(0)] });
          else if (next === "item_selection") {
            const expedition = delivery === "expedition";
            onChange({
              mode: next,
              source: expedition ? "carried_inventory" : "player",
              itemBranches: [defaultItemBranch(0)],
              noItemBranch: {
                label: "Không dùng vật phẩm",
                availability: expedition ? "fallback_only" : "always",
                resolution: defaultResolution(),
              },
            });
          }
          else onChange({ mode: next, resolution: defaultResolution() });
        }}
        options={delivery === "expedition"
          ? [
              { value: "item_selection", label: "Chọn từ hành trang" },
              { value: "scripted", label: "Tự động" },
            ]
          : [
              { value: "choices", label: "Lựa chọn" },
              { value: "item_selection", label: "Người chơi chọn item" },
            ]}
      />

      {mode === "choices" && (
        <div className="space-y-3">
          <ArrayHeader label="Choices" disabled={disabled || choices.length >= 12} onAdd={() => onChange(withField(interaction, "choices", [...choices, defaultChoice(choices.length)]))} />
          {choices.map((choice, index) => (
            <div key={index} className="space-y-3 rounded-lg border border-white/8 bg-zinc-950/45 p-3">
              <div className="flex items-end gap-2"><div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2"><TextField label="Choice key" value={choice.key} disabled={disabled} onChange={(next) => onChange(withField(interaction, "choices", replaceAt(choices, index, withField(choice, "key", next))))} /><TextField label="Nhãn" value={choice.label} disabled={disabled} onChange={(next) => onChange(withField(interaction, "choices", replaceAt(choices, index, withField(choice, "label", next))))} /></div>{choices.length > 1 && <RemoveButton disabled={disabled} onClick={() => onChange(withField(interaction, "choices", removeAt(choices, index)))} />}</div>
              <TextField label="Mô tả" value={choice.description} disabled={disabled} multiline onChange={(next) => onChange(withField(interaction, "choices", replaceAt(choices, index, withField(choice, "description", next))))} />
              <ToggleField label="Fallback" checked={choice.fallbackOnly === true} disabled={disabled} onChange={(next) => {
                const updated = withField(choice, "fallbackOnly", next || undefined);
                onChange(withField(interaction, "choices", replaceAt(choices, index, next ? withField(updated, "requirements", undefined) : updated)));
              }} />
              {!choice.fallbackOnly && <OptionalRuleBuilder label="Điều kiện" value={choice.requirements} catalog={catalog} disabled={disabled} onChange={(next) => onChange(withField(interaction, "choices", replaceAt(choices, index, withField(choice, "requirements", next))))} />}
              <ResolutionBuilder value={choice.resolution} catalog={catalog} disabled={disabled} onChange={(next) => onChange(withField(interaction, "choices", replaceAt(choices, index, withField(choice, "resolution", next))))} />
            </div>
          ))}
        </div>
      )}

      {mode === "item_selection" && (
        <div className="space-y-3">
          <SelectField
            label="Nguồn item"
            value={delivery === "expedition" ? "carried_inventory" : "player"}
            disabled
            onChange={() => undefined}
            options={delivery === "expedition"
              ? [{ value: "carried_inventory", label: "Hành trang chuyến đi" }]
              : [{ value: "player", label: "Người chơi chọn" }]}
          />
          <ArrayHeader label="Item branches" disabled={disabled || branches.length >= 24} onAdd={() => onChange(withField(interaction, "itemBranches", [...branches, defaultItemBranch(branches.length)]))} />
          {branches.map((branch, index) => (
            <div key={index} className="space-y-3 rounded-lg border border-white/8 bg-zinc-950/45 p-3">
              <div className="flex items-end gap-2"><div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2"><TextField label="Branch key" value={branch.key} disabled={disabled} onChange={(next) => onChange(withField(interaction, "itemBranches", replaceAt(branches, index, withField(branch, "key", next))))} /><ReferenceField label="Vật phẩm" value={branch.itemKey} items={catalog.items} disabled={disabled} onChange={(next) => onChange(withField(interaction, "itemBranches", replaceAt(branches, index, withField(branch, "itemKey", next))))} /></div>{branches.length > 1 && <RemoveButton disabled={disabled} onClick={() => onChange(withField(interaction, "itemBranches", removeAt(branches, index)))} />}</div>
              <div className="grid gap-3 sm:grid-cols-3"><SelectField label="Condition" value={branch.condition ?? ""} disabled={disabled} onChange={(next) => onChange(withField(interaction, "itemBranches", replaceAt(branches, index, withField(branch, "condition", next || undefined))))} options={[{ value: "", label: "Bất kỳ" }, { value: "intact", label: "Intact" }, { value: "broken", label: "Broken" }]} /><NumberField label="Số lượng" value={branch.quantity} min={1} disabled={disabled} onChange={(next) => onChange(withField(interaction, "itemBranches", replaceAt(branches, index, withField(branch, "quantity", next))))} /><NumberField label="Priority" value={branch.priority ?? index} min={0} disabled={disabled} onChange={(next) => onChange(withField(interaction, "itemBranches", replaceAt(branches, index, withField(branch, "priority", next))))} /></div>
              <OptionalRuleBuilder label="Điều kiện" value={branch.requirements} catalog={catalog} disabled={disabled} onChange={(next) => onChange(withField(interaction, "itemBranches", replaceAt(branches, index, withField(branch, "requirements", next))))} />
              <ResolutionBuilder value={branch.resolution} catalog={catalog} disabled={disabled} onChange={(next) => onChange(withField(interaction, "itemBranches", replaceAt(branches, index, withField(branch, "resolution", next))))} />
            </div>
          ))}
          {(() => {
            const noItem = asContentValue(interaction.noItemBranch);
            return <div className="space-y-3 rounded-lg border border-white/8 p-3"><div className="grid gap-3 sm:grid-cols-2"><TextField label="Nhãn không dùng item" value={noItem.label} disabled={disabled} onChange={(next) => onChange(withField(interaction, "noItemBranch", withField(noItem, "label", next)))} /><SelectField label="Availability" value={noItem.availability ?? "always"} disabled={disabled || interaction.source === "carried_inventory"} onChange={(next) => onChange(withField(interaction, "noItemBranch", withField(noItem, "availability", next)))} options={[{ value: "always", label: "Luôn hiện" }, { value: "fallback_only", label: "Chỉ fallback" }]} /></div><TextField label="Mô tả" value={noItem.description} disabled={disabled} multiline onChange={(next) => onChange(withField(interaction, "noItemBranch", withField(noItem, "description", next)))} /><ResolutionBuilder value={noItem.resolution} catalog={catalog} disabled={disabled} onChange={(next) => onChange(withField(interaction, "noItemBranch", withField(noItem, "resolution", next)))} /></div>;
          })()}
        </div>
      )}

      {mode === "scripted" && <ResolutionBuilder value={interaction.resolution} catalog={catalog} disabled={disabled} onChange={(next) => onChange(withField(interaction, "resolution", next))} />}
    </div>
  );
}
