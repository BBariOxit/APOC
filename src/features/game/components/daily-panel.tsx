import {
  BookOpen,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Ear,
  GitBranch,
  HeartPulse,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  DailyTask,
  DailyUpdate,
  GameEffect,
  GameTab,
} from "@/features/game/types";
import { cn } from "@/lib/utils";

interface DailyPanelProps {
  updates: DailyUpdate[];
  tasks: DailyTask[];
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
    className: "bg-white/5 text-zinc-400",
  },
};

const effectStyles: Record<GameEffect["tone"], string> = {
  positive: "border-emerald-300/15 bg-emerald-300/8 text-emerald-200",
  negative: "border-red-300/15 bg-red-300/8 text-red-200",
  warning: "border-amber-300/15 bg-amber-300/8 text-amber-200",
  neutral: "border-white/8 bg-white/5 text-zinc-300",
};

const taskIcons = {
  event: CircleAlert,
  care: HeartPulse,
};

export function DailyPanel({
  updates,
  tasks,
  onNavigate,
  onOpenJournal,
}: DailyPanelProps) {
  const pendingTaskCount = tasks.length;

  return (
    <section className="space-y-6">
      <Card className="overflow-hidden border-white/8 bg-zinc-900/70 py-0 shadow-none">
        <CardHeader className="border-b border-white/6 bg-gradient-to-br from-zinc-800/70 to-zinc-900 px-5 py-5 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Báo cáo đầu ngày
          </p>
          <CardTitle className="mt-2 text-2xl tracking-tight sm:text-3xl">
            Ngày 12
          </CardTitle>
          <p className="max-w-3xl text-sm leading-6 text-zinc-300 sm:text-base sm:leading-7">
            Không ai ngủ ngon tối qua. Hùng trở về khi trời gần sáng, đúng lúc
            tiếng kim loại ngoài hành lang im bặt. Lượng nước dự trữ giờ chỉ đủ
            dùng trong hôm nay.
          </p>
        </CardHeader>

        <CardContent className="grid gap-px bg-white/6 p-0 sm:grid-cols-3">
          <DailyMetric
            label="Thức ăn"
            value="6 khẩu phần"
            detail="Đủ khoảng 2 ngày"
          />
          <DailyMetric
            label="Nước sạch"
            value="4 chai"
            detail="Chỉ đủ cho hôm nay"
            tone="warning"
          />
          <DailyMetric
            label="Tinh thần nhóm"
            value="Tạm ổn"
            detail="1 người đang bất ổn"
            tone="warning"
          />
        </CardContent>
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between gap-4">
          <SectionHeader title="Diễn biến mới" className="mb-0" />
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted-foreground"
            onClick={onOpenJournal}
          >
            <BookOpen /> Xem nhật ký
          </Button>
        </div>

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
      </div>

      <div>
        <SectionHeader title="Việc cần làm" />

        {pendingTaskCount > 0 ? (
          <div className="overflow-hidden rounded-xl border border-white/8 bg-zinc-900/50">
            {tasks.map((task, index) => (
              <TaskRow
                key={task.id}
                icon={taskIcons[task.type]}
                title={task.title}
                description={task.description}
                actionLabel={task.actionLabel}
                onAction={() => onNavigate(task.destination)}
                withDivider={index > 0}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-300/10 bg-emerald-300/5 px-4 py-4 text-sm text-emerald-100/80">
            <CircleCheck className="size-4" /> Mọi việc quan trọng đã được xử
            lý.
          </div>
        )}
      </div>
    </section>
  );
}

interface SectionHeaderProps {
  title: string;
  className?: string;
}

function SectionHeader({ title, className }: SectionHeaderProps) {
  return (
    <h2 className={cn("mb-3 text-lg font-semibold", className)}>{title}</h2>
  );
}

interface DailyMetricProps {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "warning";
}

function DailyMetric({
  label,
  value,
  detail,
  tone = "neutral",
}: DailyMetricProps) {
  return (
    <div className="bg-zinc-950/70 px-5 py-4 sm:px-6">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-lg font-medium">{value}</p>
      <p
        className={cn(
          "mt-1 text-xs",
          tone === "warning" ? "text-amber-200/80" : "text-zinc-500",
        )}
      >
        {detail}
      </p>
    </div>
  );
}

interface TaskRowProps {
  icon: typeof CircleAlert;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  withDivider?: boolean;
}

function TaskRow({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  withDivider = false,
}: TaskRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-l-2 border-l-amber-300/50 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5",
        withDivider && "border-t border-t-white/6",
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-300/10 text-amber-200">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onAction}>
        {actionLabel} <ChevronRight />
      </Button>
    </div>
  );
}

interface UpdateRowProps {
  update: DailyUpdate;
  withDivider: boolean;
  onNavigate: (tab: GameTab) => void;
}

function UpdateRow({ update, withDivider, onNavigate }: UpdateRowProps) {
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
        {update.label && (
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            {update.label}
          </p>
        )}
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <h3 className="font-medium">{update.title}</h3>
          <time className="text-xs text-muted-foreground">{update.time}</time>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {update.description}
        </p>
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
