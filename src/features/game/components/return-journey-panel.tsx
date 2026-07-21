import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  MapPinned,
  PackageCheck,
  Route,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  GameEffect,
  JourneyEntry,
  ReturnJourneyReport,
} from "@/features/game/types";
import { cn } from "@/lib/utils";

interface ReturnJourneyPanelProps {
  report: ReturnJourneyReport;
  onBackToDaily: () => void;
}

const effectStyles: Record<GameEffect["tone"], string> = {
  positive: "border-emerald-300/15 bg-emerald-300/8 text-emerald-200",
  negative: "border-red-300/15 bg-red-300/8 text-red-200",
  warning: "border-amber-300/15 bg-amber-300/8 text-amber-200",
  neutral: "border-sky-300/12 bg-sky-300/6 text-sky-100/80",
};

const resultToneStyles = {
  positive: "bg-emerald-300/10 text-emerald-200",
  warning: "bg-amber-300/10 text-amber-200",
  discovery: "bg-sky-300/10 text-sky-200",
};

export function ReturnJourneyPanel({
  report,
  onBackToDaily,
}: ReturnJourneyPanelProps) {
  return (
    <section className="space-y-6">
      <Card className="overflow-hidden border-white/8 bg-zinc-900/70 py-0 shadow-none">
        <CardContent className="relative px-5 py-5 sm:px-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(120,113,108,0.1),transparent_40%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-zinc-800 font-mono text-sm font-semibold text-zinc-200">
              {report.characterInitials}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Báo cáo trở về
                </p>
              </div>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
                {report.characterName} đã trở về
              </h1>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground sm:text-sm">
                <span className="flex items-center gap-2">
                  <Route className="size-4" /> {report.durationDays} ngày bên ngoài
                </span>
                <span className="flex items-center gap-2">
                  <CalendarDays className="size-4" /> Trở về ngày {report.returnedDay}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ResultCard
          icon={PackageCheck}
          title="Mang về hầm"
          effects={report.gains}
          tone="positive"
        />
        <ResultCard
          icon={TriangleAlert}
          title="Tổn thất"
          effects={report.losses}
          tone="warning"
        />
        <ResultCard
          icon={MapPinned}
          title="Khám phá mới"
          effects={report.discoveries}
          tone="discovery"
          className="md:col-span-2 xl:col-span-1"
        />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Nhật ký hành trình</h2>

        <ol className="relative space-y-3 before:absolute before:bottom-6 before:left-[1.1rem] before:top-6 before:w-px before:bg-white/8 sm:before:left-[2.45rem]">
          {report.entries.map((entry) => (
            <JourneyRow key={entry.id} entry={entry} />
          ))}
        </ol>
      </div>

      <div className="border-t border-white/8 pt-5">
        <Button variant="outline" onClick={onBackToDaily}>
          <ArrowLeft /> Về Hằng ngày
        </Button>
      </div>
    </section>
  );
}

interface ResultCardProps {
  icon: LucideIcon;
  title: string;
  effects: GameEffect[];
  tone: keyof typeof resultToneStyles;
  className?: string;
}

function ResultCard({
  icon: Icon,
  title,
  effects,
  tone,
  className,
}: ResultCardProps) {
  return (
    <Card
      className={cn(
        "border-white/8 bg-zinc-900/45 py-0 shadow-none",
        className,
      )}
    >
      <CardContent className="flex gap-3 px-5 py-5">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg",
            resultToneStyles[tone],
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="font-medium">{title}</h2>
          <EffectList effects={effects} className="mt-3" />
        </div>
      </CardContent>
    </Card>
  );
}

interface JourneyRowProps {
  entry: JourneyEntry;
}

function JourneyRow({ entry }: JourneyRowProps) {
  return (
    <li className="relative grid gap-3 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-4">
      <div className="relative z-10 flex items-start sm:justify-center">
        <span className="inline-flex h-8 items-center rounded-md bg-zinc-900 px-2.5 text-xs font-medium text-zinc-400">
          Ngày {entry.day}
        </span>
      </div>

      <article className="rounded-xl border border-white/6 bg-zinc-900/35 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h3 className="font-medium">{entry.title}</h3>
          <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5" /> {entry.location}
          </span>
        </div>
        <p className="mt-3 max-w-[80ch] text-sm leading-6 text-muted-foreground">
          {entry.description}
        </p>
        <EffectList effects={entry.effects} className="mt-3" />
      </article>
    </li>
  );
}

interface EffectListProps {
  effects: GameEffect[];
  className?: string;
}

function EffectList({ effects, className }: EffectListProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {effects.map((effect) => (
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
  );
}
