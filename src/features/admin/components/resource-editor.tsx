"use client";

import type { ReactNode } from "react";

import {
  ArrayHeader,
  FormSection,
  NumberField,
  ReferenceField,
  ReferenceListField,
  RemoveButton,
  SelectField,
  TagsField,
  TextField,
  ToggleField,
} from "@/features/admin/components/form-controls";
import { EffectListBuilder } from "@/features/admin/components/effect-builder";
import { InteractionBuilder } from "@/features/admin/components/interaction-builder";
import { OptionalRuleBuilder, RuleBuilder } from "@/features/admin/components/rule-builder";
import { ResolutionBuilder } from "@/features/admin/components/resolution-builder";
import { TriggerBuilder } from "@/features/admin/components/trigger-builder";
import {
  asContentArray,
  asContentValue,
  removeAt,
  replaceAt,
  withField,
} from "@/features/admin/content-value";
import type {
  AdminResource,
  ContentCatalogDto,
  ContentValue,
} from "@/features/admin/types";

const rarityOptions = ["common", "uncommon", "rare", "ultra_rare"].map((value) => ({
  value,
  label: value.replaceAll("_", " "),
}));

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function CommonFields({
  value,
  onChange,
  disabled,
  description = true,
}: {
  value: ContentValue;
  onChange: (value: ContentValue) => void;
  disabled?: boolean;
  description?: boolean;
}) {
  return (
    <FormSection title="Thông tin">
      <TextField
        label="Tên"
        value={value.name}
        disabled={disabled}
        onChange={(next) => onChange(withField(value, "name", next))}
      />
      {description && (
        <TextField
          label="Mô tả"
          value={value.description}
          multiline
          disabled={disabled}
          onChange={(next) => onChange(withField(value, "description", next))}
        />
      )}
    </FormSection>
  );
}

function CharacterEditor({ value, onChange, disabled }: EditorProps) {
  const stats = asContentValue(value.baseStats);
  const updateStats = (field: string, next: number) =>
    onChange(withField(value, "baseStats", withField(stats, field, next)));
  return (
    <>
      <CommonFields value={value} onChange={onChange} disabled={disabled} />
      <FormSection title="Hiển thị">
        <TextField label="Avatar URL" type="url" value={value.avatarUrl} disabled={disabled} onChange={(next) => onChange(withField(value, "avatarUrl", next))} />
        <TagsField label="Traits" value={value.traits} disabled={disabled} onChange={(next) => onChange(withField(value, "traits", next))} />
      </FormSection>
      <FormSection title="Chỉ số gốc">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <NumberField label="Health" value={stats.health} min={0} max={100} disabled={disabled} onChange={(next) => updateStats("health", next)} />
          <NumberField label="Satiety" value={stats.satiety} min={0} max={100} disabled={disabled} onChange={(next) => updateStats("satiety", next)} />
          <NumberField label="Hydration" value={stats.hydration} min={0} max={100} disabled={disabled} onChange={(next) => updateStats("hydration", next)} />
          <NumberField label="Sanity" value={stats.sanity} min={0} max={100} disabled={disabled} onChange={(next) => updateStats("sanity", next)} />
        </div>
        <NumberField label="Số ô hành trang" value={value.baseLoadoutSlots} min={1} max={8} disabled={disabled} onChange={(next) => onChange(withField(value, "baseLoadoutSlots", next))} />
      </FormSection>
    </>
  );
}

function ConditionEditor({ value, onChange, disabled }: EditorProps) {
  const derivation = asContentValue(value.derivation);
  const type = typeof derivation.type === "string" ? derivation.type : "runtime";
  return (
    <>
      <CommonFields value={value} onChange={onChange} disabled={disabled} />
      <FormSection title="Cách phát sinh">
        <Grid>
          <SelectField label="Mức hiển thị" value={value.tone} disabled={disabled} onChange={(next) => onChange(withField(value, "tone", next))} options={["neutral", "warning", "danger"].map((item) => ({ value: item, label: item }))} />
          <SelectField label="Nguồn dữ liệu" value={type} disabled={disabled} onChange={(next) => onChange(withField(value, "derivation", next === "stat_below" ? { type: next, stat: "health", threshold: 35 } : { type: next }))} options={[{ value: "runtime", label: "Event / hiệu ứng" }, { value: "stat_below", label: "Chỉ số thấp" }, { value: "expedition_cooldown", label: "Đang hồi sức sau hành trình" }]} />
        </Grid>
        {type === "stat_below" && (
          <Grid>
            <SelectField label="Chỉ số" value={derivation.stat} disabled={disabled} onChange={(next) => onChange(withField(value, "derivation", withField(derivation, "stat", next)))} options={["health", "satiety", "hydration", "sanity"].map((item) => ({ value: item, label: item }))} />
            <NumberField label="Hiện khi thấp hơn" value={derivation.threshold} min={1} max={100} disabled={disabled} onChange={(next) => onChange(withField(value, "derivation", withField(derivation, "threshold", next)))} />
          </Grid>
        )}
      </FormSection>
    </>
  );
}

function ItemEditor({ value, onChange, catalog, disabled }: EditorProps) {
  const stackable = value.stackable === true;
  const care = value.care ? asContentValue(value.care) : null;
  const statChanges = care ? asContentValue(care.statChanges) : {};
  const careDefaults = value.category === "food"
    ? { action: "feed", statChanges: { satiety: 20 }, removesConditionKeys: [] }
    : value.category === "water"
      ? { action: "hydrate", statChanges: { hydration: 20 }, removesConditionKeys: [] }
      : { action: "heal", statChanges: { health: 20 }, removesConditionKeys: [] };
  return (
    <>
      <CommonFields value={value} onChange={onChange} disabled={disabled} />
      <FormSection title="Phân loại">
        <Grid>
          <TextField label="Icon URL" type="url" value={value.iconUrl} disabled={disabled} onChange={(next) => onChange(withField(value, "iconUrl", next))} />
          <SelectField label="Loại" value={value.category} disabled={disabled} onChange={(next) => onChange(withField(value, "category", next))} options={["food", "water", "tool", "medical", "weapon", "quest"].map((item) => ({ value: item, label: item }))} />
        </Grid>
        <TagsField label="Tags" value={value.tags} disabled={disabled} onChange={(next) => onChange(withField(value, "tags", next))} />
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <ToggleField label="Có thể xếp chồng" checked={stackable} disabled={disabled} onChange={(next) => onChange(next ? { ...value, stackable: true, maxStack: 2 } : withField({ ...value, stackable: false }, "maxStack", undefined))} />
          <ToggleField label="Có thể hỏng" checked={value.canBreak === true} disabled={disabled} onChange={(next) => onChange(withField(value, "canBreak", next))} />
          <ToggleField label="Ẩn" checked={value.hidden === true} disabled={disabled} onChange={(next) => onChange(withField(value, "hidden", next))} />
        </div>
        {stackable && <NumberField label="Stack tối đa" value={value.maxStack} min={1} max={999} disabled={disabled} onChange={(next) => onChange(withField(value, "maxStack", next))} />}
      </FormSection>
      <FormSection title="Chăm sóc nhân vật">
        <ToggleField label="Có thể sử dụng" checked={Boolean(care)} disabled={disabled} onChange={(next) => onChange(next ? { ...value, category: ["food", "water", "medical"].includes(String(value.category)) ? value.category : "medical", care: careDefaults } : withField(value, "care", undefined))} />
        {care && (
          <>
            <SelectField label="Thao tác" value={care.action} disabled={disabled} onChange={(next) => onChange(withField(value, "care", { ...care, action: next }))} options={[{ value: "feed", label: "Ăn" }, { value: "hydrate", label: "Uống" }, { value: "heal", label: "Chữa trị" }]} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(["health", "satiety", "hydration", "sanity"] as const).map((stat) => (
                <NumberField key={stat} label={`+ ${stat}`} value={statChanges[stat]} min={1} max={100} disabled={disabled} onChange={(next) => onChange(withField(value, "care", { ...care, statChanges: withField(statChanges, stat, next) }))} />
              ))}
            </div>
            <ReferenceListField label="Xóa trạng thái" value={care.removesConditionKeys} items={catalog.conditions} disabled={disabled} onChange={(next) => onChange(withField(value, "care", { ...care, removesConditionKeys: next }))} />
          </>
        )}
      </FormSection>
      <FormSection title="Mở khóa tài khoản">
        <OptionalRuleBuilder label="Điều kiện" value={value.accountUnlockRule} catalog={catalog} disabled={disabled} onChange={(next) => onChange(withField(value, "accountUnlockRule", next))} />
      </FormSection>
    </>
  );
}

function LocationEditor({ value, onChange, catalog, disabled }: EditorProps) {
  const travelDays = asContentValue(value.travelDays);
  const mapPosition = value.mapPosition ? asContentValue(value.mapPosition) : null;
  const pool = asContentArray(value.eventPool);
  return (
    <>
      <CommonFields value={value} onChange={onChange} disabled={disabled} />
      <FormSection title="Bản đồ">
        <Grid>
          <TextField label="Icon URL" type="url" value={value.iconUrl} disabled={disabled} onChange={(next) => onChange(withField(value, "iconUrl", next))} />
          <SelectField label="Nguy hiểm" value={value.dangerLevel} disabled={disabled} onChange={(next) => onChange(withField(value, "dangerLevel", next))} options={["low", "medium", "high", "extreme"].map((item) => ({ value: item, label: item }))} />
        </Grid>
        <Grid>
          <NumberField label="Ngày đi tối thiểu" value={travelDays.min} min={1} disabled={disabled} onChange={(next) => onChange(withField(value, "travelDays", withField(travelDays, "min", next)))} />
          <NumberField label="Ngày đi tối đa" value={travelDays.max} min={1} disabled={disabled} onChange={(next) => onChange(withField(value, "travelDays", withField(travelDays, "max", next)))} />
        </Grid>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <ToggleField label="Ẩn" checked={value.hidden === true} disabled={disabled} onChange={(next) => onChange(withField(value, "hidden", next))} />
          <ToggleField label="Tọa độ bản đồ" checked={Boolean(mapPosition)} disabled={disabled} onChange={(next) => onChange(withField(value, "mapPosition", next ? { x: 0, y: 0 } : undefined))} />
        </div>
        {mapPosition && <Grid><NumberField label="X" value={mapPosition.x} disabled={disabled} onChange={(next) => onChange(withField(value, "mapPosition", withField(mapPosition, "x", next)))} /><NumberField label="Y" value={mapPosition.y} disabled={disabled} onChange={(next) => onChange(withField(value, "mapPosition", withField(mapPosition, "y", next)))} /></Grid>}
        <TagsField label="Tags" value={value.tags} disabled={disabled} onChange={(next) => onChange(withField(value, "tags", next))} />
        <OptionalRuleBuilder label="Điều kiện khám phá" value={value.discoveryRequirements} catalog={catalog} disabled={disabled} onChange={(next) => onChange(withField(value, "discoveryRequirements", next))} />
      </FormSection>
      <FormSection title="Event pool">
        <ArrayHeader label={`${pool.length} event`} disabled={disabled || pool.length >= 128} onAdd={() => onChange(withField(value, "eventPool", [...pool, { eventKey: catalog.events[0]?.key ?? "", weight: 1 }]))} />
        {pool.map((entry, index) => (
          <div key={index} className="space-y-3 rounded-lg border border-white/8 bg-zinc-950/45 p-3">
            <div className="flex items-end gap-2">
              <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-3">
                <ReferenceField label="Event" value={entry.eventKey} items={catalog.events} disabled={disabled} onChange={(next) => onChange(withField(value, "eventPool", replaceAt(pool, index, withField(entry, "eventKey", next))))} />
                <NumberField label="Weight" value={entry.weight} min={1} disabled={disabled} onChange={(next) => onChange(withField(value, "eventPool", replaceAt(pool, index, withField(entry, "weight", next))))} />
                <NumberField label="Lần tối đa / chuyến" value={entry.maxOccurrencesPerExpedition ?? 1} min={1} disabled={disabled} onChange={(next) => onChange(withField(value, "eventPool", replaceAt(pool, index, withField(entry, "maxOccurrencesPerExpedition", next))))} />
              </div>
              {pool.length > 1 && <RemoveButton disabled={disabled} onClick={() => onChange(withField(value, "eventPool", removeAt(pool, index)))} />}
            </div>
            <OptionalRuleBuilder label="Điều kiện" value={entry.requirements} catalog={catalog} disabled={disabled} onChange={(next) => onChange(withField(value, "eventPool", replaceAt(pool, index, withField(entry, "requirements", next))))} />
          </div>
        ))}
      </FormSection>
    </>
  );
}

function EventEditor({ value, onChange, catalog, disabled }: EditorProps) {
  const delivery = value.delivery === "expedition" ? "expedition" : "pending";
  const setDelivery = (next: string) => {
    const expedition = next === "expedition";
    onChange({
      ...value,
      delivery: expedition ? "expedition" : "pending",
      category: expedition ? "location" : (value.category === "location" ? "daily" : value.category),
      trigger: expedition ? { mode: "location_pool", maxOccurrences: 1, cooldownDays: 0 } : { mode: "random", minDay: 1, maxDay: 30, maxOccurrences: 1, cooldownDays: 0 },
      interaction: expedition
        ? { mode: "scripted", resolution: { mode: "deterministic", title: "Kết quả", description: "Mô tả kết quả", effects: [] } }
        : { mode: "choices", choices: [{ key: "continue", label: "Tiếp tục", resolution: { mode: "deterministic", title: "Kết quả", description: "Mô tả kết quả", effects: [] } }] },
    });
  };
  return (
    <>
      <CommonFields value={value} onChange={onChange} disabled={disabled} />
      <FormSection title="Phân phối">
        <Grid>
          <TextField label="Ảnh URL" type="url" value={value.imageUrl} disabled={disabled} onChange={(next) => onChange(withField(value, "imageUrl", next))} />
          <SelectField label="Delivery" value={delivery} disabled={disabled} onChange={setDelivery} options={[{ value: "pending", label: "Người chơi xử lý" }, { value: "expedition", label: "Trong chuyến đi" }]} />
          <SelectField label="Category" value={value.category} disabled={disabled || delivery === "expedition"} onChange={(next) => onChange(withField(value, "category", next))} options={(delivery === "expedition" ? ["location"] : ["story", "daily", "special"]).map((item) => ({ value: item, label: item }))} />
          <SelectField label="Rarity" value={value.rarity} disabled={disabled} onChange={(next) => onChange(withField(value, "rarity", next))} options={rarityOptions} />
          <NumberField label="Weight" value={value.weight} min={1} disabled={disabled} onChange={(next) => onChange(withField(value, "weight", next))} />
          <TextField label="Mutex group" value={value.mutexGroup} disabled={disabled} onChange={(next) => onChange(withField(value, "mutexGroup", next))} />
        </Grid>
        <ToggleField label="Ẩn" checked={value.hidden === true} disabled={disabled} onChange={(next) => onChange(withField(value, "hidden", next))} />
        <TagsField label="Tags" value={value.tags} disabled={disabled} onChange={(next) => onChange(withField(value, "tags", next))} />
        <ReferenceListField label="Loại trừ event" value={value.exclusionEventKeys} items={catalog.events} disabled={disabled} onChange={(next) => onChange(withField(value, "exclusionEventKeys", next))} />
      </FormSection>
      <FormSection title="Kích hoạt">
        <TriggerBuilder value={value.trigger} expedition={delivery === "expedition"} disabled={disabled || delivery === "expedition"} onChange={(next) => onChange(withField(value, "trigger", next))} />
        <OptionalRuleBuilder label="Điều kiện" value={value.requirements} catalog={catalog} disabled={disabled} onChange={(next) => onChange(withField(value, "requirements", next))} />
      </FormSection>
      <FormSection title="Tương tác">
        <InteractionBuilder value={value.interaction} delivery={delivery} catalog={catalog} disabled={disabled} onChange={(next) => onChange(withField(value, "interaction", next))} />
      </FormSection>
    </>
  );
}

function AmbientEditor({ value, onChange, catalog, disabled }: EditorProps) {
  return (
    <>
      <CommonFields value={value} onChange={onChange} disabled={disabled} description={false} />
      <FormSection title="Phân phối">
        <Grid>
          <TextField label="Nhãn thời gian" value={value.timeLabel} disabled={disabled} onChange={(next) => onChange(withField(value, "timeLabel", next))} />
          <SelectField label="Rarity" value={value.rarity} disabled={disabled} onChange={(next) => onChange(withField(value, "rarity", next))} options={rarityOptions} />
          <NumberField label="Weight" value={value.weight} min={1} disabled={disabled} onChange={(next) => onChange(withField(value, "weight", next))} />
          <TextField label="Mutex group" value={value.mutexGroup} disabled={disabled} onChange={(next) => onChange(withField(value, "mutexGroup", next))} />
        </Grid>
        <ToggleField label="Ẩn" checked={value.hidden === true} disabled={disabled} onChange={(next) => onChange(withField(value, "hidden", next))} />
        <TagsField label="Tags" value={value.tags} disabled={disabled} onChange={(next) => onChange(withField(value, "tags", next))} />
        <ReferenceListField label="Loại trừ diễn biến" value={value.exclusionAmbientKeys} items={catalog.ambients} disabled={disabled} onChange={(next) => onChange(withField(value, "exclusionAmbientKeys", next))} />
      </FormSection>
      <FormSection title="Kích hoạt">
        <TriggerBuilder value={value.trigger} ambient disabled={disabled} onChange={(next) => onChange(withField(value, "trigger", next))} />
        <OptionalRuleBuilder label="Điều kiện" value={value.requirements} catalog={catalog} disabled={disabled} onChange={(next) => onChange(withField(value, "requirements", next))} />
      </FormSection>
      <FormSection title="Kết quả">
        <ResolutionBuilder value={value.resolution} catalog={catalog} disabled={disabled} onChange={(next) => onChange(withField(value, "resolution", next))} />
      </FormSection>
    </>
  );
}

function EndingEditor({ value, onChange, catalog, disabled }: EditorProps) {
  return (
    <>
      <CommonFields value={value} onChange={onChange} disabled={disabled} />
      <FormSection title="Kết thúc">
        <Grid>
          <TextField label="Ảnh URL" type="url" value={value.imageUrl} disabled={disabled} onChange={(next) => onChange(withField(value, "imageUrl", next))} />
          <SelectField label="Loại" value={value.type} disabled={disabled} onChange={(next) => onChange(withField(value, "type", next))} options={["good", "bad", "neutral", "secret", "joke"].map((item) => ({ value: item, label: item }))} />
          <NumberField label="Priority" value={value.priority} min={0} disabled={disabled} onChange={(next) => onChange(withField(value, "priority", next))} />
        </Grid>
        <ToggleField label="Ẩn" checked={value.hidden === true} disabled={disabled} onChange={(next) => onChange(withField(value, "hidden", next))} />
        <OptionalRuleBuilder label="Điều kiện" value={value.requirements} catalog={catalog} disabled={disabled} onChange={(next) => onChange(withField(value, "requirements", next))} />
      </FormSection>
    </>
  );
}

function AchievementEditor({ value, onChange, catalog, disabled }: EditorProps) {
  const progressType = String(value.progressType ?? "binary");
  return (
    <>
      <CommonFields value={value} onChange={onChange} disabled={disabled} />
      <FormSection title="Thành tựu">
        <Grid>
          <TextField label="Icon URL" type="url" value={value.iconUrl} disabled={disabled} onChange={(next) => onChange(withField(value, "iconUrl", next))} />
          <SelectField label="Độ khó" value={value.difficulty} disabled={disabled} onChange={(next) => onChange(withField(value, "difficulty", next))} options={["easy", "medium", "hard"].map((item) => ({ value: item, label: item }))} />
          <SelectField label="Tiến độ" value={progressType} disabled={disabled} onChange={(next) => onChange({ ...value, progressType: next, target: next === "binary" ? 1 : Math.max(1, Number(value.target ?? 1)) })} options={[{ value: "binary", label: "Đạt / chưa đạt" }, { value: "counter", label: "Bộ đếm" }, { value: "best_value", label: "Giá trị cao nhất" }]} />
          <NumberField label="Mục tiêu" value={value.target} min={1} disabled={disabled || progressType === "binary"} onChange={(next) => onChange(withField(value, "target", next))} />
        </Grid>
        <ToggleField label="Ẩn" checked={value.hidden === true} disabled={disabled} onChange={(next) => onChange(withField(value, "hidden", next))} />
      </FormSection>
      <FormSection title="Điều kiện">
        <RuleBuilder value={value.requirements} catalog={catalog} disabled={disabled} onChange={(next) => onChange(withField(value, "requirements", next))} />
      </FormSection>
      <FormSection title="Phần thưởng">
        <EffectListBuilder value={value.rewards} catalog={catalog} disabled={disabled} onChange={(next) => onChange(withField(value, "rewards", next))} />
      </FormSection>
    </>
  );
}

interface EditorProps {
  value: ContentValue;
  onChange: (value: ContentValue) => void;
  catalog: ContentCatalogDto;
  disabled?: boolean;
}

export function ResourceEditor({ resource, ...props }: EditorProps & { resource: AdminResource }) {
  if (resource === "characters") return <CharacterEditor {...props} />;
  if (resource === "conditions") return <ConditionEditor {...props} />;
  if (resource === "items") return <ItemEditor {...props} />;
  if (resource === "locations") return <LocationEditor {...props} />;
  if (resource === "events") return <EventEditor {...props} />;
  if (resource === "ambients") return <AmbientEditor {...props} />;
  if (resource === "endings") return <EndingEditor {...props} />;
  return <AchievementEditor {...props} />;
}
