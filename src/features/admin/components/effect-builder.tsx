"use client";

import {
  ArrayHeader,
  NumberField,
  ReferenceField,
  RemoveButton,
  SelectField,
  TextField,
} from "@/features/admin/components/form-controls";
import { asContentArray, asContentValue, removeAt, replaceAt, withField } from "@/features/admin/content-value";
import type { ContentCatalogDto, ContentValue } from "@/features/admin/types";

const effectOptions = [
  ["add_item", "Thêm vật phẩm"],
  ["remove_item", "Xoá vật phẩm"],
  ["break_item", "Làm hỏng vật phẩm"],
  ["repair_item", "Sửa vật phẩm"],
  ["modify_character_stat", "Đổi chỉ số nhân vật"],
  ["add_condition", "Thêm condition"],
  ["remove_condition", "Xoá condition"],
  ["change_character_state", "Đổi trạng thái nhân vật"],
  ["kill_character", "Giết nhân vật"],
  ["set_flag", "Đặt flag"],
  ["increment_counter", "Tăng counter"],
  ["queue_event", "Queue event"],
  ["cancel_queued_event", "Huỷ event đã queue"],
  ["queue_ambient", "Queue ambient"],
  ["cancel_queued_ambient", "Huỷ ambient đã queue"],
  ["unlock_event_in_run", "Mở event trong run"],
  ["unlock_event_for_account", "Mở event cho tài khoản"],
  ["unlock_item_for_account", "Mở item cho tài khoản"],
  ["discover_location", "Khám phá địa điểm"],
  ["mark_location_depleted", "Đánh dấu location depleted"],
  ["force_expedition_return", "Buộc expedition trở về"],
  ["grant_achievement", "Trao thành tựu"],
  ["trigger_ending", "Kích hoạt ending"],
] as const;

function defaultEffect(type: string): ContentValue {
  if (["add_item", "remove_item"].includes(type)) return { type, target: { scope: "shelter" }, itemKey: "", condition: "intact", quantity: 1 };
  if (["break_item", "repair_item"].includes(type)) return { type, target: { scope: "shelter" }, itemKey: "", quantity: 1 };
  if (type === "modify_character_stat") return { type, target: { mode: "all_shelter" }, stat: "health", amount: 0 };
  if (type === "add_condition") return { type, target: { mode: "all_shelter" }, condition: "condition_key", severity: 1, days: 1 };
  if (type === "remove_condition") return { type, target: { mode: "all_shelter" }, condition: "condition_key" };
  if (type === "change_character_state") return { type, target: { mode: "all_shelter" }, state: "shelter" };
  if (type === "kill_character") return { type, target: { mode: "all_shelter" }, cause: "Nguyên nhân" };
  if (type === "set_flag") return { type, key: "flag_key", value: true };
  if (type === "increment_counter") return { type, key: "counter_key", amount: 1 };
  if (type === "queue_event") return { type, eventKey: "", delayDays: 0 };
  if (["cancel_queued_event", "unlock_event_in_run", "unlock_event_for_account"].includes(type)) return { type, eventKey: "" };
  if (type === "queue_ambient") return { type, ambientKey: "", delayDays: 0 };
  if (type === "cancel_queued_ambient") return { type, ambientKey: "" };
  if (type === "unlock_item_for_account") return { type, itemKey: "" };
  if (type === "discover_location") return { type, locationKey: "" };
  if (type === "mark_location_depleted") return { type, locationKey: "", days: 1 };
  if (type === "force_expedition_return") return { type, reason: "Lý do" };
  if (type === "grant_achievement") return { type, achievementKey: "" };
  if (type === "trigger_ending") return { type, endingKey: "" };
  return { type: "set_flag", key: "flag_key", value: true };
}

function TargetEditor({
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
  const target = asContentValue(value);
  const mode = String(target.mode ?? "all_shelter");
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SelectField
        label="Target"
        value={mode}
        disabled={disabled}
        onChange={(next) => onChange(next === "character" ? { mode: next, characterKey: "" } : { mode: next })}
        options={[
          { value: "character", label: "Nhân vật cụ thể" },
          { value: "expedition_character", label: "Nhân vật expedition" },
          { value: "all_shelter", label: "Tất cả trong shelter" },
        ]}
      />
      {mode === "character" && (
        <ReferenceField label="Nhân vật" value={target.characterKey} items={catalog.characters} disabled={disabled} onChange={(next) => onChange(withField(target, "characterKey", next))} />
      )}
    </div>
  );
}

function FlagValue({ value, onChange, disabled }: { value: unknown; onChange: (value: unknown) => void; disabled?: boolean }) {
  const kind = typeof value === "boolean" ? "boolean" : typeof value === "number" ? "number" : "string";
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SelectField label="Kiểu giá trị" value={kind} disabled={disabled} onChange={(next) => onChange(next === "boolean" ? true : next === "number" ? 0 : "")} options={[{ value: "boolean", label: "Boolean" }, { value: "number", label: "Number" }, { value: "string", label: "String" }]} />
      {kind === "boolean" ? (
        <SelectField label="Giá trị" value={String(value)} disabled={disabled} onChange={(next) => onChange(next === "true")} options={[{ value: "true", label: "True" }, { value: "false", label: "False" }]} />
      ) : kind === "number" ? (
        <NumberField label="Giá trị" value={value} disabled={disabled} onChange={onChange} />
      ) : (
        <TextField label="Giá trị" value={value} disabled={disabled} onChange={onChange} />
      )}
    </div>
  );
}

export function EffectBuilder({
  value,
  onChange,
  onRemove,
  catalog,
  disabled,
}: {
  value: unknown;
  onChange: (value: ContentValue) => void;
  onRemove: () => void;
  catalog: ContentCatalogDto;
  disabled?: boolean;
}) {
  const effect = asContentValue(value);
  const type = String(effect.type ?? "set_flag");
  const target = asContentValue(effect.target);
  const inventoryEffect = ["add_item", "remove_item", "break_item", "repair_item"].includes(type);
  const characterEffect = ["modify_character_stat", "add_condition", "remove_condition", "change_character_state", "kill_character"].includes(type);

  return (
    <div className="space-y-3 rounded-lg border border-white/8 bg-zinc-950/45 p-3">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <SelectField label="Effect" value={type} disabled={disabled} onChange={(next) => onChange(defaultEffect(next))} options={effectOptions.map(([option, label]) => ({ value: option, label }))} />
        </div>
        <RemoveButton onClick={onRemove} disabled={disabled} />
      </div>

      {inventoryEffect && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SelectField label="Kho" value={target.scope ?? "shelter"} disabled={disabled} onChange={(next) => onChange(withField(effect, "target", { scope: next }))} options={[{ value: "shelter", label: "Shelter" }, { value: "carried_inventory", label: "Carried" }]} />
          <ReferenceField label="Vật phẩm" value={effect.itemKey} items={catalog.items} disabled={disabled} onChange={(next) => onChange(withField(effect, "itemKey", next))} />
          {["add_item", "remove_item"].includes(type) && <SelectField label="Condition" value={effect.condition} disabled={disabled} onChange={(next) => onChange(withField(effect, "condition", next))} options={[{ value: "intact", label: "Intact" }, { value: "broken", label: "Broken" }]} />}
          <NumberField label="Số lượng" value={effect.quantity} min={1} disabled={disabled} onChange={(next) => onChange(withField(effect, "quantity", next))} />
        </div>
      )}

      {characterEffect && (
        <div className="space-y-3">
          <TargetEditor value={effect.target} catalog={catalog} disabled={disabled} onChange={(next) => onChange(withField(effect, "target", next))} />
          {type === "modify_character_stat" && <div className="grid gap-3 sm:grid-cols-2"><SelectField label="Chỉ số" value={effect.stat} disabled={disabled} onChange={(next) => onChange(withField(effect, "stat", next))} options={["health", "satiety", "hydration", "sanity"].map((item) => ({ value: item, label: item }))} /><NumberField label="Thay đổi" value={effect.amount} disabled={disabled} onChange={(next) => onChange(withField(effect, "amount", next))} /></div>}
          {["add_condition", "remove_condition"].includes(type) && <div className="grid gap-3 sm:grid-cols-3"><ReferenceField label="Trạng thái" value={effect.condition} items={catalog.conditions} disabled={disabled} onChange={(next) => onChange(withField(effect, "condition", next))} />{type === "add_condition" && <><NumberField label="Severity" value={effect.severity ?? 1} min={1} disabled={disabled} onChange={(next) => onChange(withField(effect, "severity", next))} /><NumberField label="Số ngày" value={effect.days ?? 1} min={1} disabled={disabled} onChange={(next) => onChange(withField(effect, "days", next))} /></>}</div>}
          {type === "change_character_state" && <SelectField label="Trạng thái" value={effect.state} disabled={disabled} onChange={(next) => onChange(withField(effect, "state", next))} options={["shelter", "expedition", "missing", "dead", "insane"].map((item) => ({ value: item, label: item }))} />}
          {type === "kill_character" && <TextField label="Nguyên nhân" value={effect.cause} disabled={disabled} onChange={(next) => onChange(withField(effect, "cause", next))} />}
        </div>
      )}

      {type === "set_flag" && <div className="space-y-3"><TextField label="Flag key" value={effect.key} disabled={disabled} onChange={(next) => onChange(withField(effect, "key", next))} /><FlagValue value={effect.value} disabled={disabled} onChange={(next) => onChange(withField(effect, "value", next))} /></div>}
      {type === "increment_counter" && <div className="grid gap-3 sm:grid-cols-2"><TextField label="Counter key" value={effect.key} disabled={disabled} onChange={(next) => onChange(withField(effect, "key", next))} /><NumberField label="Amount" value={effect.amount} disabled={disabled} onChange={(next) => onChange(withField(effect, "amount", next))} /></div>}
      {["queue_event", "cancel_queued_event", "unlock_event_in_run", "unlock_event_for_account"].includes(type) && <div className="grid gap-3 sm:grid-cols-2"><ReferenceField label="Event" value={effect.eventKey} items={catalog.events} disabled={disabled} onChange={(next) => onChange(withField(effect, "eventKey", next))} />{type === "queue_event" && <NumberField label="Delay days" value={effect.delayDays} min={0} disabled={disabled} onChange={(next) => onChange(withField(effect, "delayDays", next))} />}</div>}
      {["queue_ambient", "cancel_queued_ambient"].includes(type) && <div className="grid gap-3 sm:grid-cols-2"><ReferenceField label="Ambient" value={effect.ambientKey} items={catalog.ambients} disabled={disabled} onChange={(next) => onChange(withField(effect, "ambientKey", next))} />{type === "queue_ambient" && <NumberField label="Delay days" value={effect.delayDays} min={0} disabled={disabled} onChange={(next) => onChange(withField(effect, "delayDays", next))} />}</div>}
      {type === "unlock_item_for_account" && <ReferenceField label="Vật phẩm" value={effect.itemKey} items={catalog.items} disabled={disabled} onChange={(next) => onChange(withField(effect, "itemKey", next))} />}
      {["discover_location", "mark_location_depleted"].includes(type) && <div className="grid gap-3 sm:grid-cols-2"><ReferenceField label="Địa điểm" value={effect.locationKey} items={catalog.locations} disabled={disabled} onChange={(next) => onChange(withField(effect, "locationKey", next))} />{type === "mark_location_depleted" && <NumberField label="Số ngày" value={effect.days ?? 1} min={1} disabled={disabled} onChange={(next) => onChange(withField(effect, "days", next))} />}</div>}
      {type === "force_expedition_return" && <TextField label="Lý do" value={effect.reason} disabled={disabled} onChange={(next) => onChange(withField(effect, "reason", next))} />}
      {type === "grant_achievement" && <ReferenceField label="Thành tựu" value={effect.achievementKey} items={catalog.achievements} disabled={disabled} onChange={(next) => onChange(withField(effect, "achievementKey", next))} />}
      {type === "trigger_ending" && <ReferenceField label="Ending" value={effect.endingKey} items={catalog.endings} disabled={disabled} onChange={(next) => onChange(withField(effect, "endingKey", next))} />}
    </div>
  );
}

export function EffectListBuilder({
  value,
  onChange,
  catalog,
  disabled,
  label = "Effects",
}: {
  value: unknown;
  onChange: (value: ContentValue[]) => void;
  catalog: ContentCatalogDto;
  disabled?: boolean;
  label?: string;
}) {
  const effects = asContentArray(value);
  return (
    <div className="space-y-2">
      <ArrayHeader label={label} disabled={disabled || effects.length >= 32} onAdd={() => onChange([...effects, defaultEffect("set_flag")])} />
      {effects.map((effect, index) => (
        <EffectBuilder key={index} value={effect} catalog={catalog} disabled={disabled} onChange={(next) => onChange(replaceAt(effects, index, next))} onRemove={() => onChange(removeAt(effects, index))} />
      ))}
    </div>
  );
}
