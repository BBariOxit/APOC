"use client";

import {
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleAlert,
  Clock3,
  LockKeyhole,
  MessageSquareText,
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
  onResolve: (eventId: string, choiceId: string) => void;
  onFinish: () => void;
}

const effectStyles: Record<GameEffect["tone"], string> = {
  positive: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  negative: "border-red-300/20 bg-red-300/10 text-red-200",
  warning: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  neutral: "border-sky-300/20 bg-sky-300/10 text-sky-200",
};

const itemUsageLabels: Record<
  NonNullable<EventChoice["requiredItem"]>["usage"],
  string
> = {
  consume: "Sẽ tiêu hao",
  retain: "Không tiêu hao",
  risk: "Có thể bị mất",
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
  const pendingEvents = events.filter((event) => !resolvedChoices[event.id]);
  const requiredCount = pendingEvents.filter(
    (event) => event.urgency === "required",
  ).length;

  return (
    <section aria-labelledby="event-queue-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="event-queue-heading" className="text-sm font-medium">
          {pendingEvents.length > 0
            ? `${pendingEvents.length} sự kiện chờ xử lý`
            : "Đã xử lý mọi sự kiện"}
        </h2>
        {requiredCount > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-amber-200/80">
            <CircleAlert className="size-3.5" />
            {requiredCount} bắt buộc
          </span>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {events.map((event) => {
          const isActive = event.id === activeEventId;
          const isResolved = Boolean(resolvedChoices[event.id]);

          return (
            <button
              key={event.id}
              type="button"
              aria-current={isActive ? "true" : undefined}
              onClick={() => onSelect(event.id)}
              className={cn(
                "flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                isActive
                  ? "border-zinc-500 bg-zinc-800/70"
                  : "border-white/8 bg-zinc-900/40 hover:border-white/15 hover:bg-zinc-900/70",
              )}
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg",
                  isResolved
                    ? "bg-emerald-300/10 text-emerald-200"
                    : event.urgency === "required"
                      ? "bg-amber-300/10 text-amber-200"
                      : "bg-white/5 text-muted-foreground",
                )}
              >
                {isResolved ? (
                  <Check className="size-4" />
                ) : (
                  <MessageSquareText className="size-4" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {event.title}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {isResolved
                    ? "Đã xử lý"
                    : event.urgency === "required"
                      ? "Bắt buộc"
                      : "Tùy chọn"}
                  {event.expiresAtDay
                    ? ` · Hết hạn ngày ${event.expiresAtDay}`
                    : ""}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
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
    !requirement || availableQuantity >= requirement.quantity;

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
          <span className="mt-1 block text-sm leading-6 text-muted-foreground">
            {choice.description}
          </span>

          {requirement && (
            <span className="mt-3 flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="gap-1.5 bg-white/6 font-normal text-zinc-300"
              >
                {item && <ItemIcon icon={item.icon} className="size-3.5" />}
                {item?.shortName ?? "Vật phẩm"} x{requirement.quantity}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {itemUsageLabels[requirement.usage]}
              </span>
            </span>
          )}

          {!isAvailable && requirement && (
            <span className="mt-2 flex items-center gap-1.5 text-xs text-red-300">
              <LockKeyhole className="size-3.5" />
              Thiếu {Math.max(requirement.quantity - availableQuantity, 0)}{" "}
              {item?.shortName.toLowerCase() ?? "vật phẩm"}
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
      {events.length > 1 && (
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
        <Card className="overflow-hidden border-white/8 bg-zinc-900/65 py-0 shadow-none">
          <div
            className={cn(
              "h-0.5",
              activeEvent.urgency === "required"
                ? "bg-amber-300/70"
                : "bg-zinc-500/60",
            )}
          />
          <CardHeader className="px-5 pb-5 pt-6 sm:px-6">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <span>{activeEvent.category}</span>
              <span aria-hidden="true">·</span>
              <span
                className={cn(
                  activeEvent.urgency === "required" && "text-amber-200/80",
                )}
              >
                {activeEvent.urgency === "required" ? "Bắt buộc" : "Tùy chọn"}
              </span>
              {activeEvent.expiresAtDay && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="flex items-center gap-1 normal-case tracking-normal text-amber-200/75">
                    <Clock3 className="size-3.5" />
                    Hết hạn cuối ngày
                  </span>
                </>
              )}
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
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Bạn sẽ làm gì?
              </p>
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

            <div className="flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Không thể thay đổi sau khi xác nhận.
              </p>
              <Button
                disabled={!selectedChoiceId}
                onClick={() =>
                  selectedChoiceId &&
                  onResolve(activeEvent.id, selectedChoiceId)
                }
                className="sm:min-w-44"
              >
                Xác nhận lựa chọn
                <ChevronRight />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.section>
  );
}
