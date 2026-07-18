import { Backpack, Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getLoadoutSlotCapacity } from "@/features/game/expedition";
import type {
  CharacterStatKey,
  GameCharacter,
} from "@/features/game/types";
import { cn } from "@/lib/utils";

interface ExpeditionCharacterOptionProps {
  character: GameCharacter;
  isSelected: boolean;
  onSelect: () => void;
}

const characterStats: Array<{
  key: CharacterStatKey;
  label: string;
}> = [
  { key: "health", label: "Sức khỏe" },
  { key: "satiety", label: "Dinh dưỡng" },
  { key: "hydration", label: "Nước" },
  { key: "sanity", label: "Tinh thần" },
];

const conditionToneClasses: Record<
  GameCharacter["conditions"][number]["tone"],
  string
> = {
  neutral: "border-zinc-600/70 bg-zinc-700/20 text-zinc-300",
  warning: "border-amber-300/35 bg-amber-300/10 text-amber-200",
  danger: "border-rose-300/35 bg-rose-300/10 text-rose-200",
};

export function ExpeditionCharacterOption({
  character,
  isSelected,
  onSelect,
}: ExpeditionCharacterOptionProps) {
  const capacity = getLoadoutSlotCapacity(character);
  const lostSlots = character.baseLoadoutSlots - capacity;

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border px-3 py-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isSelected
          ? "border-zinc-400/80 bg-zinc-800/80"
          : "border-white/8 bg-zinc-950/30 hover:bg-zinc-800/55",
      )}
    >
      <span className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-lg border font-mono text-xs",
            isSelected
              ? "border-zinc-500 bg-zinc-700"
              : "border-white/8 bg-zinc-900",
          )}
        >
          {character.initials}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-zinc-100">{character.name}</span>
            {character.conditions.map((condition) => (
              <Badge
                key={condition.label}
                variant="outline"
                className={cn(
                  "h-5 px-2 text-[11px]",
                  conditionToneClasses[condition.tone],
                )}
              >
                {condition.label}
              </Badge>
            ))}
          </span>

          <span className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
            {characterStats.map((stat) => {
              const value = character.stats[stat.key];

              return (
                <span
                  key={stat.key}
                  className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground sm:block"
                >
                  <span>{stat.label}</span>
                  <span
                    className={cn(
                      "font-medium tabular-nums text-zinc-300 sm:ml-1",
                      value <= 35 && "text-rose-300",
                    )}
                  >
                    {value}
                  </span>
                </span>
              );
            })}
          </span>
        </span>

        <span className="flex shrink-0 flex-col items-end gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs tabular-nums",
              lostSlots > 0
                ? "border-amber-300/30 bg-amber-300/8 text-amber-200"
                : "border-white/10 bg-white/5 text-zinc-300",
            )}
          >
            <Backpack className="size-3.5" /> {capacity} ô
          </span>
          {isSelected && (
            <span className="grid size-5 place-items-center rounded-full bg-zinc-100 text-zinc-950">
              <Check className="size-3" />
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
