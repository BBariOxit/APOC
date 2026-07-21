import { Check } from "lucide-react";

import type { GameCharacter } from "@/features/game/types";
import { cn } from "@/lib/utils";

interface ExpeditionCharacterOptionProps {
  character: GameCharacter;
  isSelected: boolean;
  onSelect: () => void;
}

export function ExpeditionCharacterOption({
  character,
  isSelected,
  onSelect,
}: ExpeditionCharacterOptionProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      className={cn(
        "flex min-h-16 w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isSelected
          ? "border-zinc-400/80 bg-zinc-800/80"
          : "border-white/8 bg-zinc-950/30 hover:bg-zinc-800/55",
      )}
    >
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
      <span className="min-w-0 flex-1 font-medium text-zinc-100">
        {character.name}
      </span>
      {isSelected && (
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-950">
          <Check className="size-3" />
        </span>
      )}
    </button>
  );
}
