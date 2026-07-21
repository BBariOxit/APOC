import {
  BookOpen,
  ChevronRight,
  CircleCheck,
  Ear,
  Footprints,
  GitBranch,
  History,
  PackageCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  DailyUpdate,
  GameEffect,
  GameTab,
} from "@/features/game/types";
import { cn } from "@/lib/utils";

interface DailyPanelProps {
  day: number;
  ambients: DailyUpdate[];
  previousDayInventoryChanges: DailyUpdate[];
  previousDayEventReports: DailyUpdate[];
  expeditionUpdates: DailyUpdate[];
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
  previousDayInventoryChanges,
  previousDayEventReports,
  expeditionUpdates,
  onNavigate,
  onOpenJournal,
}: DailyPanelProps) {
  const hasUpdates =
    ambients.length > 0 ||
    previousDayEventReports.length > 0 ||
    previousDayInventoryChanges.length > 0 ||
    expeditionUpdates.length > 0;

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

      {hasUpdates ? (
        <>
          {ambients.length > 0 && (
            <DailySection icon={Ear} title="Đầu ngày">
              <UpdateList
                updates={ambients}
                showDescription
                onNavigate={onNavigate}
              />
            </DailySection>
          )}

          {previousDayEventReports.length > 0 && (
            <DailySection icon={History} title="Báo cáo sự kiện hôm qua">
              <UpdateList
                updates={previousDayEventReports}
                showDescription
                onNavigate={onNavigate}
              />
            </DailySection>
          )}

          {previousDayInventoryChanges.length > 0 && (
            <DailySection icon={PackageCheck} title="Vật tư hôm qua">
              <UpdateList
                updates={previousDayInventoryChanges}
                onNavigate={onNavigate}
              />
            </DailySection>
          )}

          {expeditionUpdates.length > 0 && (
            <DailySection icon={Footprints} title="Thám hiểm">
              <UpdateList
                updates={expeditionUpdates}
                showDescription
                onNavigate={onNavigate}
              />
            </DailySection>
          )}
        </>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-zinc-500">
          <CircleCheck className="size-4" /> Chưa có diễn biến mới trong ngày này.
        </div>
      )}
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
        <h3 className="font-medium">{update.title}</h3>
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
