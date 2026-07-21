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
  Sunrise,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  return (
    <section className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium tracking-[0.16em] text-zinc-500 uppercase">
            <Sunrise className="size-3.5" /> Tổng hợp hằng ngày
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Ngày {day}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Những thay đổi và việc cần chú ý kể từ lần qua ngày gần nhất.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="self-start text-muted-foreground sm:self-auto"
          onClick={onOpenJournal}
        >
          <BookOpen /> Xem nhật ký
        </Button>
      </header>

      <DailySection
        icon={Ear}
        title="Diễn biến đầu ngày"
        description="Ambient được chọn theo điều kiện, trọng số và lịch sử của ván."
        count={ambients.length}
      >
        <UpdateList
          updates={ambients}
          emptyTitle="Buổi sáng yên ắng"
          emptyDescription="Không có ambient nào được kích hoạt trong ngày này."
          onNavigate={onNavigate}
        />
      </DailySection>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <DailySection
          icon={PackageCheck}
          title="Tổng kết hôm qua"
          description="Vật tư, chỉ số và trạng thái đã thay đổi khi qua ngày."
          count={previousDayChanges.length}
        >
          <UpdateList
            updates={previousDayChanges}
            emptyTitle="Chưa có thay đổi được ghi nhận"
            emptyDescription="Dữ liệu tiêu hao và nhận được sẽ xuất hiện sau lần qua ngày đầu tiên."
            onNavigate={onNavigate}
          />
        </DailySection>

        <DailySection
          icon={CircleAlert}
          title="Sự kiện chờ xử lý"
          description="Các quyết định bắt buộc phải hoàn tất trước khi qua ngày."
          count={pendingEvents.length}
          tone={pendingEvents.length > 0 ? "warning" : "neutral"}
        >
          {pendingEvents.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-amber-300/15 bg-amber-300/5">
              {pendingEvents.map((task, index) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  withDivider={index > 0}
                  onAction={() => onNavigate(task.destination)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CircleCheck}
              title="Không còn sự kiện chờ"
              description="Bạn có thể tiếp tục quản lý nhóm hoặc qua ngày."
              positive
            />
          )}
        </DailySection>
      </div>

      <DailySection
        icon={Footprints}
        title="Tin thám hiểm"
        description="Khởi hành, tín hiệu mới, trở về và báo cáo hành trình."
        count={expeditionUpdates.length}
      >
        <UpdateList
          updates={expeditionUpdates}
          emptyTitle="Chưa có tin từ bên ngoài"
          emptyDescription="Các thay đổi của chuyến thám hiểm sẽ được cập nhật tại đây."
          onNavigate={onNavigate}
        />
      </DailySection>

      <DailySection
        icon={History}
        title="Kết quả gần đây"
        description="Hệ quả lựa chọn, thành tựu và kết thúc vừa được kích hoạt."
        count={recentResults.length}
      >
        <UpdateList
          updates={recentResults}
          emptyTitle="Chưa có kết quả mới"
          emptyDescription="Kết quả từ những hành động gần nhất sẽ được lưu tại đây."
          onNavigate={onNavigate}
        />
      </DailySection>
    </section>
  );
}

function DailySection({
  icon: Icon,
  title,
  description,
  count,
  tone = "neutral",
  children,
}: {
  icon: typeof Ear;
  title: string;
  description: string;
  count: number;
  tone?: "neutral" | "warning";
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`daily-${title.replaceAll(" ", "-").toLocaleLowerCase("vi")}`}>
      <header className="mb-3 flex items-start gap-3">
        <span className={cn(
          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white/5 text-zinc-400",
          tone === "warning" && "bg-amber-300/10 text-amber-200",
        )}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2
              id={`daily-${title.replaceAll(" ", "-").toLocaleLowerCase("vi")}`}
              className="text-lg font-semibold"
            >
              {title}
            </h2>
            <Badge
              variant="secondary"
              className={cn(
                "min-w-5 justify-center px-1.5 font-mono text-[10px]",
                tone === "warning" && "bg-amber-300/10 text-amber-200",
              )}
            >
              {count}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs leading-5 text-zinc-500">{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function UpdateList({
  updates,
  emptyTitle,
  emptyDescription,
  onNavigate,
}: {
  updates: DailyUpdate[];
  emptyTitle: string;
  emptyDescription: string;
  onNavigate: (tab: GameTab) => void;
}) {
  if (updates.length === 0) {
    return (
      <EmptyState
        icon={CircleCheck}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/8 bg-zinc-900/50">
      {updates.map((update, index) => (
        <UpdateRow
          key={update.id}
          update={update}
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
    <div className={cn(
      "flex flex-col gap-3 border-l-2 border-l-amber-300/50 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5",
      withDivider && "border-t border-t-white/6",
    )}>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-300/10 text-amber-200">
        <CircleAlert className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-medium">{task.title}</h3>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{task.description}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onAction}>
        {task.actionLabel} <ChevronRight />
      </Button>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  positive = false,
}: {
  icon: typeof CircleCheck;
  title: string;
  description: string;
  positive?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-start gap-3 rounded-xl border border-dashed border-white/10 bg-zinc-900/25 px-4 py-4",
      positive && "border-emerald-300/15 bg-emerald-300/5",
    )}>
      <Icon className={cn("mt-0.5 size-4 shrink-0 text-zinc-500", positive && "text-emerald-200")} />
      <div>
        <p className={cn("text-sm font-medium text-zinc-300", positive && "text-emerald-100")}>{title}</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

function UpdateRow({
  update,
  withDivider,
  onNavigate,
}: {
  update: DailyUpdate;
  withDivider: boolean;
  onNavigate: (tab: GameTab) => void;
}) {
  const presentation = updatePresentation[update.kind];
  const Icon = presentation.icon;
  const content = (
    <>
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", presentation.className)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div>
            {update.label && (
              <p className="mb-1 text-[11px] font-medium tracking-wider text-zinc-500 uppercase">
                {update.label}
              </p>
            )}
            <h3 className="font-medium">{update.title}</h3>
          </div>
          <span className="shrink-0 text-xs text-zinc-500">{update.time}</span>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{update.description}</p>
        {update.effects && update.effects.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {update.effects.map((effect) => (
              <span
                key={effect.label}
                className={cn("rounded-md border px-2 py-1 text-xs font-medium", effectStyles[effect.tone])}
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
    "group flex w-full gap-3 px-4 py-4 text-left sm:gap-4 sm:px-5",
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
