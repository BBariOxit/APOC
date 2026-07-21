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
  const characterColumns = [
    characters
      .map((character, index) => ({ character, index }))
      .filter(({ index }) => index % 2 === 0),
    characters
      .map((character, index) => ({ character, index }))
      .filter(({ index }) => index % 2 === 1),
  ];
  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Nhân vật</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-zinc-600/70 bg-zinc-900 px-3 text-zinc-300">
            <Users className="size-3.5" />
            {shelterCount}/{characters.length} trong hầm
          </span>
        </div>
      </header>

      <div className="grid items-start gap-3 xl:grid-cols-2">
        {characterColumns.map((column, columnIndex) => (
          <div
            key={columnIndex}
            className="contents xl:grid xl:gap-3"
          >
            {column.map(({ character, index }) => (
              <div key={character.id} style={{ order: index }}>
                <CharacterCard character={character} onCare={onCare} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
