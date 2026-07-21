import {
  BookOpen,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Ear,
  Footprints,
  GitBranch,
  History,
  PackageCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  DailyTask,
  DailyUpdate,
  GameEffect,
  GameTab,
} from "@/features/game/types";
import { cn } from "@/lib/utils";

interface DailyPanelProps {
  day: number;
  ambients: DailyUpdate[];
  previousDayChanges: DailyUpdate[];
  pendingEvents: DailyTask[];
  expeditionUpdates: DailyUpdate[];
  recentResults: DailyUpdate[];
  onNavigate: (tab: GameTab) => void;
  onOpenJournal: () => void;
}

const updatePresentation = {
  outcome: {
    icon: GitBranch,
    className: "bg-white/5 text-zinc-300",
  },
  return: {
    icon: CircleCheck,
    className: "bg-emerald-400/10 text-emerald-200",
  },
  ambient: {
    icon: Ear,
    className: "bg-sky-300/8 text-sky-200/80",
  },
};

const effectStyles: Record<GameEffect["tone"], string> = {
  positive: "border-emerald-300/15 bg-emerald-300/8 text-emerald-200",
  negative: "border-red-300/15 bg-red-300/8 text-red-200",
  warning: "border-amber-300/15 bg-amber-300/8 text-amber-200",
  neutral: "border-white/8 bg-white/5 text-zinc-300",
};

export function DailyPanel({
  day,
  ambients,
  previousDayChanges,
  pendingEvents,
  expeditionUpdates,
  recentResults,
  onNavigate,
  onOpenJournal,
}: DailyPanelProps) {
  const hasUpdates =
    ambients.length > 0 ||
    previousDayChanges.length > 0 ||
    expeditionUpdates.length > 0 ||
    recentResults.length > 0;

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Ngày {day}</h1>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={onOpenJournal}
        >
          <BookOpen /> Nhật ký
        </Button>
      </header>

      {pendingEvents.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-amber-300/20 bg-amber-300/5">
          {pendingEvents.map((task, index) => (
            <TaskRow
              key={task.id}
              task={task}
              withDivider={index > 0}
              onAction={() => onNavigate(task.destination)}
            />
          ))}
        </div>
      )}

      {hasUpdates ? (
        <>
          {(ambients.length > 0 || previousDayChanges.length > 0) && (
            <div
              className={cn(
                "grid items-start gap-6",
                ambients.length > 0 &&
                  previousDayChanges.length > 0 &&
                  "xl:grid-cols-2",
              )}
            >
              {ambients.length > 0 && (
                <DailySection icon={Ear} title="Đầu ngày">
                  <UpdateList
                    updates={ambients}
                    showDescription
                    onNavigate={onNavigate}
                  />
                </DailySection>
              )}

              {previousDayChanges.length > 0 && (
                <DailySection icon={PackageCheck} title="Hôm qua">
                  <UpdateList
                    updates={previousDayChanges}
                    onNavigate={onNavigate}
                  />
                </DailySection>
              )}
            </div>
          )}

          {(expeditionUpdates.length > 0 || recentResults.length > 0) && (
            <div
              className={cn(
                "grid items-start gap-6",
                expeditionUpdates.length > 0 &&
                  recentResults.length > 0 &&
                  "xl:grid-cols-2",
              )}
            >
              {expeditionUpdates.length > 0 && (
                <DailySection icon={Footprints} title="Thám hiểm">
                  <UpdateList
                    updates={expeditionUpdates}
                    showDescription
                    onNavigate={onNavigate}
                  />
                </DailySection>
              )}

              {recentResults.length > 0 && (
                <DailySection icon={History} title="Kết quả gần đây">
                  <UpdateList
                    updates={recentResults}
                    showDescription
                    onNavigate={onNavigate}
                  />
                </DailySection>
              )}
            </div>
          )}
        </>
      ) : pendingEvents.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-zinc-500">
          <CircleCheck className="size-4" /> Chưa có diễn biến mới trong ngày này.
        </div>
      ) : null}
    </section>
  );
}

function DailySection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Ear;
  title: string;
  children: React.ReactNode;
}) {
  const headingId = `daily-${title.replaceAll(" ", "-").toLocaleLowerCase("vi")}`;

  return (
    <section aria-labelledby={headingId}>
      <header className="mb-3 flex items-center gap-2 text-zinc-400">
        <Icon className="size-4" />
        <h2 id={headingId} className="text-lg font-semibold text-zinc-100">
          {title}
        </h2>
      </header>
      {children}
    </section>
  );
}

function UpdateList({
  updates,
  showDescription = false,
  onNavigate,
}: {
  updates: DailyUpdate[];
  showDescription?: boolean;
  onNavigate: (tab: GameTab) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/8 bg-zinc-900/50">
      {updates.map((update, index) => (
        <UpdateRow
          key={update.id}
          update={update}
          showDescription={showDescription}
          withDivider={index > 0}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

function TaskRow({
  task,
  onAction,
  withDivider,
}: {
  task: DailyTask;
  onAction: () => void;
  withDivider: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-l-2 border-l-amber-300/60 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5",
        withDivider && "border-t border-t-white/6",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <CircleAlert className="size-4 shrink-0 text-amber-200" />
        <h2 className="font-medium text-amber-50">{task.title}</h2>
      </div>
      <Button className="self-start sm:self-auto" variant="outline" size="sm" onClick={onAction}>
        {task.actionLabel} <ChevronRight />
      </Button>
    </div>
  );
}

function UpdateRow({
  update,
  showDescription,
  withDivider,
  onNavigate,
}: {
  update: DailyUpdate;
  showDescription: boolean;
  withDivider: boolean;
  onNavigate: (tab: GameTab) => void;
}) {
  const presentation = updatePresentation[update.kind];
  const Icon = presentation.icon;
  const content = (
    <>
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg",
          presentation.className,
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <h3 className="font-medium">{update.title}</h3>
          <span className="shrink-0 text-xs text-zinc-500">{update.time}</span>
        </div>
        {showDescription && (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {update.description}
          </p>
        )}
        {update.effects && update.effects.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {update.effects.map((effect) => (
              <span
                key={effect.label}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs font-medium",
                  effectStyles[effect.tone],
                )}
              >
                {effect.label}
              </span>
            ))}
          </div>
        )}
        {update.destination && update.actionLabel && (
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-zinc-300">
            {update.actionLabel}
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        )}
      </div>
    </>
  );
  const rowClassName = cn(
    "group flex w-full gap-3 px-4 py-3.5 text-left sm:gap-4 sm:px-5",
    withDivider && "border-t border-white/6",
  );

  if (update.destination) {
    return (
      <button
        type="button"
        className={cn(
          rowClassName,
          "transition-colors hover:bg-white/3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        )}
        onClick={() => onNavigate(update.destination!)}
      >
        {content}
      </button>
    );
  }

  return <article className={rowClassName}>{content}</article>;
}
