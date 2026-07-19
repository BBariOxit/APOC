"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ArrayHeader,
  NumberField,
  ReferenceField,
  RemoveButton,
  SelectField,
  TextField,
} from "@/features/admin/components/form-controls";
import {
  asContentArray,
  asContentValue,
  removeAt,
  replaceAt,
  withField,
} from "@/features/admin/content-value";
import type { ContentCatalogDto, ContentValue } from "@/features/admin/types";

const ruleOptions = [
  ["all", "Tất cả điều kiện"],
  ["any", "Một trong các điều kiện"],
  ["not", "Phủ định"],
  ["day_gte", "Ngày ≥"],
  ["day_lte", "Ngày ≤"],
  ["has_item", "Có vật phẩm"],
  ["flag_equals", "Flag bằng"],
  ["counter_gte", "Counter ≥"],
  ["event_completed", "Đã hoàn thành event"],
  ["event_choice_made", "Đã chọn nhánh event"],
  ["achievement_unlocked", "Đã mở thành tựu"],
  ["location_discovered", "Đã khám phá địa điểm"],
  ["location_visited", "Đã ghé địa điểm"],
  ["current_location", "Đang ở địa điểm"],
  ["expedition_day_gte", "Ngày expedition ≥"],
  ["character_state", "Trạng thái nhân vật"],
  ["alive_count_gte", "Số người sống ≥"],
] as const;

function ruleKind(rule: ContentValue): string {
  if (Array.isArray(rule.all)) return "all";
  if (Array.isArray(rule.any)) return "any";
  if (rule.not) return "not";
  return String(rule.type ?? "day_gte");
}

function defaultRule(kind: string): ContentValue {
  if (kind === "all" || kind === "any") return { [kind]: [{ type: "day_gte", value: 1 }] };
  if (kind === "not") return { not: { type: "day_gte", value: 1 } };
  const defaults: Record<string, ContentValue> = {
    day_gte: { type: kind, value: 1 },
    day_lte: { type: kind, value: 1 },
    has_item: { type: kind, itemKey: "", quantity: 1, scope: "shelter" },
    flag_equals: { type: kind, key: "flag_key", value: true },
    counter_gte: { type: kind, key: "counter_key", value: 1 },
    event_completed: { type: kind, eventKey: "" },
    event_choice_made: { type: kind, eventKey: "", choiceKey: "choice_key" },
    achievement_unlocked: { type: kind, achievementKey: "" },
    location_discovered: { type: kind, locationKey: "" },
    location_visited: { type: kind, locationKey: "", minVisits: 1 },
    current_location: { type: kind, locationKey: "" },
    expedition_day_gte: { type: kind, value: 1 },
    character_state: { type: kind, characterKey: "", state: "shelter" },
    alive_count_gte: { type: kind, value: 1 },
  };
  return defaults[kind] ?? { type: "day_gte", value: 1 };
}

function BooleanOrValueEditor({
  value,
  onChange,
  disabled,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) {
  const type = typeof value === "boolean" ? "boolean" : typeof value === "number" ? "number" : "string";
  return (
    <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
      <SelectField
        label="Kiểu"
        value={type}
        disabled={disabled}
        onChange={(next) => onChange(next === "boolean" ? true : next === "number" ? 0 : "")}
        options={[
          { value: "boolean", label: "Boolean" },
          { value: "number", label: "Number" },
          { value: "string", label: "String" },
        ]}
      />
      {type === "boolean" ? (
        <SelectField
          label="Giá trị"
          value={String(value)}
          disabled={disabled}
          onChange={(next) => onChange(next === "true")}
          options={[
            { value: "true", label: "True" },
            { value: "false", label: "False" },
          ]}
        />
      ) : type === "number" ? (
        <NumberField label="Giá trị" value={value} disabled={disabled} onChange={onChange} />
      ) : (
        <TextField label="Giá trị" value={value} disabled={disabled} onChange={onChange} />
      )}
    </div>
  );
}

export function RuleBuilder({
  value,
  onChange,
  catalog,
  disabled,
  onRemove,
  depth = 0,
}: {
  value: unknown;
  onChange: (value: ContentValue) => void;
  catalog: ContentCatalogDto;
  disabled?: boolean;
  onRemove?: () => void;
  depth?: number;
}) {
  const rule = asContentValue(value);
  const kind = ruleKind(rule);
  const nestedKey = kind === "all" || kind === "any" ? kind : null;

  return (
    <div className="space-y-3 rounded-lg border border-white/8 bg-zinc-950/45 p-3">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <SelectField
            label={depth === 0 ? "Điều kiện" : "Loại"}
            value={kind}
            disabled={disabled}
            onChange={(next) => onChange(defaultRule(next))}
            options={ruleOptions.map(([option, label]) => ({ value: option, label }))}
          />
        </div>
        {onRemove && <RemoveButton onClick={onRemove} disabled={disabled} />}
      </div>

      {nestedKey && (() => {
        const children = asContentArray(rule[nestedKey]);
        return (
          <div className="space-y-2 border-l border-white/10 pl-3">
            {children.map((child, index) => (
              <RuleBuilder
                key={index}
                value={child}
                catalog={catalog}
                disabled={disabled}
                depth={depth + 1}
                onChange={(next) => onChange({ ...rule, [nestedKey]: replaceAt(children, index, next) })}
                onRemove={children.length > 1 ? () => onChange({ ...rule, [nestedKey]: removeAt(children, index) }) : undefined}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={disabled}
              onClick={() => onChange({ ...rule, [nestedKey]: [...children, defaultRule("day_gte")] })}
            >
              <Plus /> Điều kiện
            </Button>
          </div>
        );
      })()}

      {kind === "not" && (
        <div className="border-l border-white/10 pl-3">
          <RuleBuilder
            value={rule.not}
            catalog={catalog}
            disabled={disabled}
            depth={depth + 1}
            onChange={(next) => onChange({ not: next })}
          />
        </div>
      )}

      {["day_gte", "day_lte", "expedition_day_gte", "alive_count_gte"].includes(kind) && (
        <NumberField label="Giá trị" value={rule.value} min={kind === "alive_count_gte" ? 0 : 1} disabled={disabled} onChange={(next) => onChange(withField(rule, "value", next))} />
      )}
      {kind === "has_item" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ReferenceField label="Vật phẩm" value={rule.itemKey} items={catalog.items} disabled={disabled} onChange={(next) => onChange(withField(rule, "itemKey", next))} />
          <SelectField label="Condition" value={rule.condition ?? ""} disabled={disabled} onChange={(next) => onChange(withField(rule, "condition", next || undefined))} options={[{ value: "", label: "Bất kỳ" }, { value: "intact", label: "Intact" }, { value: "broken", label: "Broken" }]} />
          <NumberField label="Số lượng" value={rule.quantity} min={1} disabled={disabled} onChange={(next) => onChange(withField(rule, "quantity", next))} />
          <SelectField label="Kho" value={rule.scope ?? "shelter"} disabled={disabled} onChange={(next) => onChange(withField(rule, "scope", next))} options={[{ value: "shelter", label: "Shelter" }, { value: "carried_inventory", label: "Carried" }]} />
        </div>
      )}
      {kind === "flag_equals" && (
        <div className="space-y-3">
          <TextField label="Flag key" value={rule.key} disabled={disabled} onChange={(next) => onChange(withField(rule, "key", next))} />
          <BooleanOrValueEditor value={rule.value} disabled={disabled} onChange={(next) => onChange(withField(rule, "value", next))} />
        </div>
      )}
      {kind === "counter_gte" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Counter key" value={rule.key} disabled={disabled} onChange={(next) => onChange(withField(rule, "key", next))} />
          <NumberField label="Giá trị" value={rule.value} min={0} disabled={disabled} onChange={(next) => onChange(withField(rule, "value", next))} />
        </div>
      )}
      {(kind === "event_completed" || kind === "event_choice_made") && (
        <div className="grid gap-3 sm:grid-cols-2">
          <ReferenceField label="Event" value={rule.eventKey} items={catalog.events} disabled={disabled} onChange={(next) => onChange(withField(rule, "eventKey", next))} />
          {kind === "event_choice_made" && <TextField label="Choice key" value={rule.choiceKey} disabled={disabled} onChange={(next) => onChange(withField(rule, "choiceKey", next))} />}
        </div>
      )}
      {kind === "achievement_unlocked" && <ReferenceField label="Thành tựu" value={rule.achievementKey} items={catalog.achievements} disabled={disabled} onChange={(next) => onChange(withField(rule, "achievementKey", next))} />}
      {["location_discovered", "location_visited", "current_location"].includes(kind) && (
        <div className="grid gap-3 sm:grid-cols-2">
          <ReferenceField label="Địa điểm" value={rule.locationKey} items={catalog.locations} disabled={disabled} onChange={(next) => onChange(withField(rule, "locationKey", next))} />
          {kind === "location_visited" && <NumberField label="Số lần tối thiểu" value={rule.minVisits ?? 1} min={1} disabled={disabled} onChange={(next) => onChange(withField(rule, "minVisits", next))} />}
        </div>
      )}
      {kind === "character_state" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <ReferenceField label="Nhân vật" value={rule.characterKey} items={catalog.characters} disabled={disabled} onChange={(next) => onChange(withField(rule, "characterKey", next))} />
          <SelectField label="Trạng thái" value={rule.state} disabled={disabled} onChange={(next) => onChange(withField(rule, "state", next))} options={["shelter", "expedition", "missing", "dead", "insane"].map((item) => ({ value: item, label: item }))} />
        </div>
      )}
    </div>
  );
}

export function OptionalRuleBuilder({
  label,
  value,
  onChange,
  catalog,
  disabled,
}: {
  label: string;
  value: unknown;
  onChange: (value: ContentValue | undefined) => void;
  catalog: ContentCatalogDto;
  disabled?: boolean;
}) {
  if (!value) {
    return (
      <ArrayHeader label={label} disabled={disabled} onAdd={() => onChange(defaultRule("day_gte"))} />
    );
  }
  return (
    <div className="space-y-2">
      <span className="block text-xs font-medium text-zinc-400">{label}</span>
      <RuleBuilder value={value} onChange={onChange} onRemove={() => onChange(undefined)} catalog={catalog} disabled={disabled} />
    </div>
  );
}
