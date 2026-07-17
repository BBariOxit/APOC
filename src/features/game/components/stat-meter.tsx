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
    return "[&_[data-slot=progress-indicator]]:bg-red-400";
  }

  if (value <= 60) {
    return "[&_[data-slot=progress-indicator]]:bg-amber-300";
  }

  return "[&_[data-slot=progress-indicator]]:bg-emerald-400";
}

export function StatMeter({ label, value }: StatMeterProps) {
  return (
    <Progress
      value={value}
      className={cn(
        "gap-x-3 gap-y-1 [&_[data-slot=progress-track]]:h-1.5",
        getTone(value),
      )}
    >
      <ProgressLabel className="text-xs font-normal text-muted-foreground">
        {label}
      </ProgressLabel>
      <span className="ml-auto text-xs tabular-nums text-foreground">
        {value}
      </span>
    </Progress>
  );
}
