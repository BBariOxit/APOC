import {
  Progress,
  ProgressLabel,
} from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface StatMeterProps {
  label: string;
  value: number;
}

function getTone(value: number) {
  if (value <= 35) {
    return "[&_[data-slot=progress-indicator]]:bg-rose-400";
  }

  return "[&_[data-slot=progress-indicator]]:bg-zinc-300";
}

export function StatMeter({ label, value }: StatMeterProps) {
  return (
    <Progress
      value={value}
      className={cn(
        "gap-x-3 gap-y-1.5 [&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-track]]:bg-zinc-700",
        getTone(value),
      )}
    >
      <ProgressLabel className="text-xs font-normal text-zinc-400">
        {label}
      </ProgressLabel>
      <span
        className={cn(
          "ml-auto text-xs tabular-nums",
          value <= 35 ? "text-rose-300" : "text-zinc-200",
        )}
      >
        {value}<span className="text-zinc-500">/100</span>
      </span>
    </Progress>
  );
}
