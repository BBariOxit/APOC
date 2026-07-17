import {
  ArrowDownRight,
  ArrowUpRight,
  CircleCheck,
  Clock3,
  MoonStar,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DailyUpdate } from "@/features/game/types";
import { cn } from "@/lib/utils";

interface DailyPanelProps {
  updates: DailyUpdate[];
  onOpenEvent: () => void;
}

const updateIcons = {
  warning: TriangleAlert,
  success: CircleCheck,
  neutral: Clock3,
};

const updateStyles = {
  warning: "bg-amber-400/10 text-amber-200",
  success: "bg-emerald-400/10 text-emerald-200",
  neutral: "bg-white/5 text-zinc-300",
};

export function DailyPanel({ updates, onOpenEvent }: DailyPanelProps) {
  return (
    <section className="space-y-5">
      <Card className="overflow-hidden border-white/8 bg-zinc-900/70 py-0 shadow-none">
        <CardHeader className="border-b border-white/6 bg-gradient-to-br from-zinc-800/80 to-zinc-900 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge
              variant="outline"
              className="border-white/10 bg-black/10 text-zinc-300"
            >
              <MoonStar /> Báo cáo buổi sáng
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">
              17.07 · 06:40
            </span>
          </div>
          <CardTitle className="mt-5 text-2xl tracking-tight sm:text-3xl">
            Ngày 12
          </CardTitle>
          <p className="max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base sm:leading-7">
            Không ai ngủ ngon tối qua. Tiếng kim loại ngoài hành lang chỉ dừng
            lại khi trời gần sáng, còn lượng nước dự trữ đã xuống thấp hơn dự
            tính.
          </p>
        </CardHeader>

        <CardContent className="grid gap-px bg-white/6 p-0 sm:grid-cols-3">
          <DailyMetric
            label="Thức ăn"
            value="6 khẩu phần"
            change="-2 hôm qua"
            trend="down"
          />
          <DailyMetric
            label="Nước sạch"
            value="4 chai"
            change="-2 hôm qua"
            trend="down"
          />
          <DailyMetric
            label="Tinh thần nhóm"
            value="Tạm ổn"
            change="+3 sau tin của Hùng"
            trend="up"
          />
        </CardContent>
      </Card>

      <button
        type="button"
        onClick={onOpenEvent}
        className="group flex w-full items-center justify-between gap-4 rounded-xl border border-amber-300/15 bg-amber-300/8 px-4 py-3 text-left transition-colors hover:bg-amber-300/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/40"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-300/10 text-amber-200">
            <TriangleAlert className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-amber-100">Có một sự kiện chờ xử lý</p>
            <p className="truncate text-xs text-amber-100/60">
              Giải quyết trước khi kết thúc ngày hiện tại.
            </p>
          </div>
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-amber-200 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </button>

      <div>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Diễn biến gần đây</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Những thay đổi có ảnh hưởng đến hôm nay.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {updates.length} cập nhật
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/8 bg-zinc-900/50">
          {updates.map((update, index) => {
            const Icon = updateIcons[update.type];

            return (
              <article
                key={update.id}
                className={cn(
                  "flex gap-3 px-4 py-4 sm:gap-4 sm:px-5",
                  index > 0 && "border-t border-white/6",
                )}
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg",
                    updateStyles[update.type],
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                    <h3 className="font-medium">{update.title}</h3>
                    <time className="text-xs text-muted-foreground">
                      {update.time}
                    </time>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {update.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

interface DailyMetricProps {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
}

function DailyMetric({ label, value, change, trend }: DailyMetricProps) {
  const TrendIcon = trend === "up" ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="bg-zinc-950/70 px-5 py-4 sm:px-6">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-lg font-medium">{value}</p>
      <p
        className={cn(
          "mt-1 flex items-center gap-1 text-xs",
          trend === "up" ? "text-emerald-300" : "text-zinc-500",
        )}
      >
        <TrendIcon className="size-3" /> {change}
      </p>
    </div>
  );
}
