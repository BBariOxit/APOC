import {
  Backpack,
  CircleDot,
  EyeOff,
  RadioTower,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ItemIcon } from "@/features/game/components/item-icon";
import type { GameCharacter, InventoryItem } from "@/features/game/types";
import { cn } from "@/lib/utils";

interface ExpeditionPanelProps {
  characters: GameCharacter[];
  inventory: InventoryItem[];
  selectedCharacterId: string | null;
  selectedLoadoutIds: string[];
  onSelectCharacter: (characterId: string) => void;
  onToggleLoadout: (itemId: string, checked: boolean) => void;
  onDepart: () => void;
}

export function ExpeditionPanel({
  characters,
  inventory,
  selectedCharacterId,
  selectedLoadoutIds,
  onSelectCharacter,
  onToggleLoadout,
  onDepart,
}: ExpeditionPanelProps) {
  const activeExpeditions = characters.filter(
    (character) => character.state === "expedition",
  );
  const availableCharacters = characters.filter(
    (character) => character.state === "shelter",
  );
  const loadoutItems = inventory.filter(
    (item) =>
      item.condition === "intact" &&
      ["tool", "medical", "water"].includes(item.category),
  );
  const canDepart = selectedCharacterId !== null;

  return (
    <section className="space-y-5">
      <header>
        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <RadioTower className="size-3.5" /> Bên ngoài
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Thám hiểm</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          Chọn một người đủ khỏe và chỉ mang theo những vật tư thực sự cần thiết.
        </p>
      </header>

      {activeExpeditions.map((character) => (
        <Card
          key={character.id}
          className="border-sky-300/15 bg-sky-300/5 shadow-none"
        >
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-sky-300/10 font-mono text-xs text-sky-100">
                {character.initials}
              </span>
              <div>
                <CardTitle className="text-base">
                  {character.name} đang ở bên ngoài
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Chưa có tin tức. Hành trình chỉ được biết khi họ trở về.
                </p>
              </div>
            </div>
            <EyeOff className="mt-1 size-4 shrink-0 text-sky-200/70" />
          </CardHeader>
        </Card>
      ))}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
        <Card className="border-white/8 bg-zinc-900/60 shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Bước 1
                </p>
                <CardTitle className="mt-1 text-lg">Chọn người ra ngoài</CardTitle>
              </div>
              <Badge variant="secondary">
                {availableCharacters.length} sẵn sàng
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {availableCharacters.map((character) => {
              const isSelected = selectedCharacterId === character.id;
              const averageCondition = Math.round(
                (character.stats.health +
                  character.stats.satiety +
                  character.stats.hydration) /
                  3,
              );

              return (
                <button
                  key={character.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectCharacter(character.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "border-zinc-400 bg-zinc-800"
                      : "border-white/8 bg-zinc-950/30 hover:bg-zinc-800/60",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-lg border font-mono text-xs",
                      isSelected
                        ? "border-zinc-500 bg-zinc-700"
                        : "border-white/8 bg-zinc-900",
                    )}
                  >
                    {character.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{character.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Thể trạng {averageCondition}% · {character.role}
                    </p>
                  </div>
                  <CircleDot
                    className={cn(
                      "size-4",
                      isSelected ? "text-zinc-100" : "text-zinc-700",
                    )}
                  />
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-white/8 bg-zinc-900/60 shadow-none">
          <CardHeader>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Bước 2
            </p>
            <CardTitle className="text-lg">Chuẩn bị hành trang</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadoutItems.map((item) => {
              const isChecked = selectedLoadoutIds.includes(item.id);

              return (
                <label
                  key={item.id}
                  className="group flex cursor-pointer items-center gap-3 rounded-lg border border-white/8 bg-zinc-950/30 p-3 transition-colors hover:bg-zinc-800/60"
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      onToggleLoadout(item.id, checked)
                    }
                  />
                  <span className="grid size-8 place-items-center rounded-lg bg-white/5 text-zinc-300">
                    <ItemIcon icon={item.icon} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {item.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Có {item.quantity} trong kho
                    </span>
                  </span>
                </label>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/8 bg-zinc-900/60 shadow-none">
        <CardContent className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-300/10 text-amber-200">
              <ShieldAlert className="size-4" />
            </span>
            <div>
              <p className="font-medium">Mức nguy hiểm: Cao</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Thời gian trở về chưa xác định. Vật phẩm mang đi sẽ rời khỏi kho.
              </p>
            </div>
          </div>
          <Button
            size="lg"
            disabled={!canDepart}
            className="shrink-0"
            onClick={onDepart}
          >
            <Backpack /> Cho xuất phát
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
