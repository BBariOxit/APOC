import { Users } from "lucide-react";

import { CharacterCard, type CareAction } from "./character-card";
import type { GameCharacter } from "@/features/game/types";

interface CharactersPanelProps {
  characters: GameCharacter[];
  onCare: (character: GameCharacter, action: CareAction) => void;
}

export function CharactersPanel({
  characters,
  onCare,
}: CharactersPanelProps) {
  const shelterCount = characters.filter(
    (character) => character.state === "shelter",
  ).length;

  return (
    <section className="space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <Users className="size-3.5" /> Nhóm sống sót
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Nhân vật</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Theo dõi tình trạng và phân phối vật tư trước khi sang ngày mới.
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums">{shelterCount}</p>
          <p className="text-xs text-muted-foreground">đang trong hầm</p>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        {characters.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            onCare={onCare}
          />
        ))}
      </div>
    </section>
  );
}
