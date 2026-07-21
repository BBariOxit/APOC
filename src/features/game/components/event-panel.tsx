"use client";

import {
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  LockKeyhole,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ItemIcon } from "@/features/game/components/item-icon";
import type {
  CurrentEvent,
  EventChoice,
  GameEffect,
  InventoryItem,
} from "@/features/game/types";
import { cn } from "@/lib/utils";

interface EventPanelProps {
  events: CurrentEvent[];
  inventory: InventoryItem[];
  resolvedChoices: Record<string, string>;
  showEventQueue?: boolean;
  onResolve: (eventId: string, choiceId: string) => void;
  onFinish: () => void;
}

const effectStyles: Record<GameEffect["tone"], string> = {
  positive: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  negative: "border-red-300/20 bg-red-300/10 text-red-200",
  warning: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  neutral: "border-sky-300/20 bg-sky-300/10 text-sky-200",
};

const rarityStyles: Record<
  CurrentEvent["rarity"],
  {
    label: string;
    accent: string;
    badge: string;
    queueActive: string;
    queueIdle: string;
    shell: string;
    text: string;
  }
> = {
  common: {
    label: "Thường",
    accent: "bg-zinc-500/60",
    badge: "border-white/10 bg-white/5 text-zinc-400",
    queueActive: "border-zinc-500 bg-zinc-800/70",
    queueIdle: "border-white/10",
    shell: "border-white/8 bg-zinc-900/65",
    text: "text-zinc-400",
  },
  uncommon: {
    label: "Ít gặp",
    accent: "bg-gradient-to-r from-sky-300/80 via-sky-400/35 to-transparent",
    badge: "border-sky-300/20 bg-sky-300/10 text-sky-200",
    queueActive: "border-sky-300/30 bg-sky-300/5",
    queueIdle: "border-sky-300/15",
    shell: "border-sky-300/15 bg-sky-950/10",
    text: "text-sky-200/80",
  },
  rare: {
    label: "Hiếm",
    accent:
      "bg-gradient-to-r from-violet-300/90 via-violet-400/40 to-transparent",
    badge: "border-violet-300/20 bg-violet-300/10 text-violet-200",
    queueActive: "border-violet-300/35 bg-violet-300/5",
    queueIdle: "border-violet-300/15",
    shell:
      "border-violet-300/20 bg-violet-950/10 shadow-[0_0_32px_rgba(139,92,246,0.05)]",
    text: "text-violet-200/85",
  },
  ultra_rare: {
    label: "Cực hiếm",
    accent:
      "bg-gradient-to-r from-amber-200 via-amber-400/60 to-transparent",
    badge: "border-amber-200/25 bg-amber-300/10 text-amber-100",
    queueActive: "border-amber-200/40 bg-amber-300/5",
    queueIdle: "border-amber-200/15",
    shell:
      "border-amber-200/25 bg-amber-950/10 shadow-[0_0_40px_rgba(251,191,36,0.08)]",
    text: "text-amber-100/90",
  },
};

function getAvailableQuantity(
  inventory: InventoryItem[],
  itemKey: string,
) {
  return inventory
    .filter((item) => item.key === itemKey && item.condition === "intact")
    .reduce((total, item) => total + item.quantity, 0);
}

function EventQueue({
  events,
  activeEventId,
  resolvedChoices,
  onSelect,
}: {
  events: CurrentEvent[];
  activeEventId: string;
  resolvedChoices: Record<string, string>;
  onSelect: (eventId: string) => void;
}) {
  return (
    <section aria-label="Các sự kiện mẫu">
      <div
        className={cn(
          "grid gap-2 sm:grid-cols-2",
          events.length === 3 && "xl:grid-cols-3",
          events.length >= 4 && "2xl:grid-cols-4",
        )}
      >
        {events.map((event) => {
          const isActive = event.id === activeEventId;
          const isResolved = Boolean(resolvedChoices[event.id]);
          const rarity = rarityStyles[event.rarity];

          return (
            <button
              key={event.id}
              type="button"
              aria-current={isActive ? "true" : undefined}
              onClick={() => onSelect(event.id)}
              className={cn(
                "flex min-h-20 min-w-0 flex-col items-start rounded-xl border bg-zinc-900/40 px-4 py-3 text-left transition-colors outline-none hover:bg-zinc-900/70 focus-visible:ring-2 focus-visible:ring-ring/60",
                isActive ? rarity.queueActive : rarity.queueIdle,
              )}
            >
              <span className="flex w-full min-w-0 items-start gap-2">
                <span className="line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-5">
                  {event.title}
                </span>
                {isResolved && (
                  <span
                    className="mt-0.5 shrink-0 text-emerald-200"
                    title="Đã xử lý"
                  >
                    <Check className="size-4" />
                    <span className="sr-only">Đã xử lý</span>
                  </span>
                )}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "mt-auto shrink-0 px-1.5 font-normal",
                  rarity.badge,
                )}
              >
                {rarity.label}
              </Badge>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ChoiceCard({
  choice,
  inventory,
  selected,
  onSelect,
}: {
  choice: EventChoice;
  inventory: InventoryItem[];
  selected: boolean;
  onSelect: () => void;
}) {
  const requirement = choice.requiredItem;
  const item = requirement
    ? inventory.find(
        (inventoryItem) => inventoryItem.key === requirement.itemKey,
      )
    : undefined;
  const availableQuantity = requirement
    ? getAvailableQuantity(inventory, requirement.itemKey)
    : Number.POSITIVE_INFINITY;
  const isAvailable =
    choice.available !== false &&
    (!requirement || availableQuantity >= requirement.quantity);

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={!isAvailable}
      onClick={onSelect}
      className={cn(
        "group w-full rounded-xl border p-4 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-55",
        selected
          ? "border-zinc-400 bg-zinc-800/80 ring-1 ring-zinc-400/30"
          : "border-white/8 bg-zinc-950/45 hover:border-white/15 hover:bg-zinc-900/70",
      )}
    >
      <span className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-zinc-400 group-aria-pressed:text-zinc-100">
          {selected ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <Circle className="size-5" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-zinc-100">
            {choice.label}
          </span>
          {choice.description && (
            <span className="mt-1 block text-sm leading-6 text-muted-foreground">
              {choice.description}
            </span>
          )}

          {requirement && (
            <span className="mt-3 flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="gap-1.5 bg-white/6 font-normal text-zinc-300"
              >
                {item && <ItemIcon icon={item.icon} className="size-3.5" />}
                {item?.shortName ?? "Vật phẩm"} x{requirement.quantity}
              </Badge>
            </span>
          )}

          {!isAvailable && (
            <span className="mt-2 flex items-center gap-1.5 text-xs text-red-300">
              <LockKeyhole className="size-3.5" />
              {choice.unavailableReason ??
                (requirement
                  ? `Thiếu ${Math.max(requirement.quantity - availableQuantity, 0)} ${item?.shortName.toLowerCase() ?? "vật phẩm"}`
                  : "Lựa chọn này chưa khả dụng")}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

function EventResult({
  event,
  choice,
  hasNextEvent,
  onContinue,
}: {
  event: CurrentEvent;
  choice: EventChoice;
  hasNextEvent: boolean;
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border-emerald-300/15 bg-zinc-900/65 shadow-none">
        <CardHeader className="flex-row items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-300/10 text-emerald-200">
            <Check className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-200/70">
              Kết quả
            </p>
            <CardTitle className="mt-1 text-xl">{choice.result.title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
            {choice.result.description}
          </p>

          {choice.result.effects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {choice.result.effects.map((effect) => (
                <Badge
                  key={effect.label}
                  variant="outline"
                  className={cn("font-normal", effectStyles[effect.tone])}
                >
                  {effect.label}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {event.title} đã được ghi vào nhật ký.
            </p>
            <Button onClick={onContinue} className="sm:min-w-44">
              {hasNextEvent ? "Sự kiện tiếp theo" : "Về đầu ngày"}
              <ChevronRight />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function EventPanel({
  events,
  inventory,
  resolvedChoices,
  showEventQueue = false,
  onResolve,
  onFinish,
}: EventPanelProps) {
  const [activeEventId, setActiveEventId] = useState(
    () =>
      events.find((event) => !resolvedChoices[event.id])?.id ?? events[0]?.id,
  );
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 px-5 py-14 text-center">
        <CheckCircle2 className="mx-auto size-6 text-emerald-200" />
        <p className="mt-3 font-medium">Không có sự kiện chờ xử lý</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Bạn có thể tiếp tục quản lý nhóm hoặc qua ngày.
        </p>
      </div>
    );
  }

  const activeEvent =
    events.find((event) => event.id === activeEventId) ?? events[0];
  const resolvedChoiceId = resolvedChoices[activeEvent.id];
  const resolvedChoice = activeEvent.choices.find(
    (choice) => choice.id === resolvedChoiceId,
  );
  const pendingEvents = events.filter((event) => !resolvedChoices[event.id]);
  const hasNextEvent = pendingEvents.some(
    (event) => event.id !== activeEvent.id,
  );
  const activeRarity = rarityStyles[activeEvent.rarity];

  function handleSelectEvent(eventId: string) {
    setActiveEventId(eventId);
    setSelectedChoiceId(null);
  }

  function handleContinue() {
    const nextEvent = events.find(
      (event) => event.id !== activeEvent.id && !resolvedChoices[event.id],
    );

    if (nextEvent) {
      handleSelectEvent(nextEvent.id);
      return;
    }

    onFinish();
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5"
    >
      {showEventQueue && events.length > 1 && (
        <EventQueue
          events={events}
          activeEventId={activeEvent.id}
          resolvedChoices={resolvedChoices}
          onSelect={handleSelectEvent}
        />
      )}

      {resolvedChoice ? (
        <EventResult
          event={activeEvent}
          choice={resolvedChoice}
          hasNextEvent={hasNextEvent}
          onContinue={handleContinue}
        />
      ) : (
        <Card
          className={cn(
            "overflow-hidden py-0 transition-colors",
            activeRarity.shell,
          )}
        >
          <div className={cn("h-0.5", activeRarity.accent)} />
          <CardHeader className="px-5 pb-5 pt-6 sm:px-6">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <span>{activeEvent.category}</span>
              <span aria-hidden="true">·</span>
              <span className={activeRarity.text}>{activeRarity.label}</span>
            </div>
            <CardTitle className="mt-2 text-2xl tracking-tight sm:text-3xl">
              {activeEvent.title}
            </CardTitle>
            <p className="font-mono text-xs text-muted-foreground">
              Ngày {activeEvent.day} · {activeEvent.location}
            </p>
          </CardHeader>

          <CardContent className="space-y-6 px-5 pb-6 sm:px-6">
            <p className="max-w-3xl text-base leading-7 text-zinc-300">
              {activeEvent.description}
            </p>

            <div className="space-y-3 border-t border-white/8 pt-5">
              {activeEvent.choices.map((choice) => (
                <ChoiceCard
                  key={choice.id}
                  choice={choice}
                  inventory={inventory}
                  selected={choice.id === selectedChoiceId}
                  onSelect={() => setSelectedChoiceId(choice.id)}
                />
              ))}
            </div>

            <div className="flex justify-end border-t border-white/8 pt-5">
              <Button
                disabled={!selectedChoiceId}
                onClick={() =>
                  selectedChoiceId &&
                  onResolve(activeEvent.id, selectedChoiceId)
                }
                className="min-w-32"
              >
                Xác nhận
                <ChevronRight />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.section>
  );
}
