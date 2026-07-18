import { Backpack, EyeOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExpeditionCharacterOption } from "@/features/game/components/expedition-character-option";
import { ExpeditionLoadoutSlot } from "@/features/game/components/expedition-loadout-slot";
import {
  getLoadoutSlotCapacity,
  removeLoadoutSlot,
  setLoadoutSlot,
} from "@/features/game/expedition";
import type { GameCharacter, InventoryItem } from "@/features/game/types";
import { cn } from "@/lib/utils";

interface ExpeditionPanelProps {
  characters: GameCharacter[];
  inventory: InventoryItem[];
  selectedCharacterId: string | null;
  selectedLoadoutIds: string[];
  onSelectCharacter: (characterId: string) => void;
  onChangeLoadout: (itemIds: string[]) => void;
  onDepart: () => void;
}

export function ExpeditionPanel({
  characters,
  inventory,
  selectedCharacterId,
  selectedLoadoutIds,
  onSelectCharacter,
  onChangeLoadout,
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
  const selectedCharacter = availableCharacters.find(
    (character) => character.id === selectedCharacterId,
  );
  const slotCapacity = selectedCharacter
    ? getLoadoutSlotCapacity(selectedCharacter)
    : 0;
  const lostSlots = selectedCharacter
    ? selectedCharacter.baseLoadoutSlots - slotCapacity
    : 0;
  const overflowCount = Math.max(
    0,
    selectedLoadoutIds.length - slotCapacity,
  );
  const visibleSlotCount = Math.max(
    slotCapacity,
    selectedLoadoutIds.length,
  );
  const selectedItemCounts = selectedLoadoutIds.reduce((counts, itemId) => {
    counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const hasUnavailableItems = Array.from(selectedItemCounts).some(
    ([itemId, selectedCount]) => {
      const inventoryItem = loadoutItems.find((item) => item.id === itemId);
      return !inventoryItem || selectedCount > inventoryItem.quantity;
    },
  );
  const canDepart =
    selectedCharacter !== undefined &&
    overflowCount === 0 &&
    !hasUnavailableItems;
  const departLabel = !selectedCharacter
    ? "Chọn người đi"
    : overflowCount > 0
      ? `Bỏ bớt ${overflowCount} món`
      : hasUnavailableItems
        ? "Kiểm tra hành trang"
        : "Cho xuất phát";

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Thám hiểm</h2>
      </header>

      {activeExpeditions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Đang ở bên ngoài
          </p>
          {activeExpeditions.map((character) => (
            <Card
              key={character.id}
              size="sm"
              className="bg-zinc-900/55 shadow-none"
            >
              <CardContent className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-white/6 font-mono text-xs">
                  {character.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{character.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Chưa có tin tức từ chuyến đi.
                  </p>
                </div>
                <EyeOff className="size-4 text-zinc-500" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <Card className="bg-zinc-900/55 shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">Người đi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {availableCharacters.map((character) => (
              <ExpeditionCharacterOption
                key={character.id}
                character={character}
                isSelected={selectedCharacterId === character.id}
                onSelect={() => onSelectCharacter(character.id)}
              />
            ))}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/55 shadow-none">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Hành trang</CardTitle>
                {selectedCharacter && lostSlots > 0 && (
                  <p className="mt-1 text-xs text-amber-200/80">
                    Giảm {lostSlots} ô do sức khỏe hiện tại.
                  </p>
                )}
              </div>
              {selectedCharacter && (
                <Badge
                  variant="outline"
                  className={cn(
                    "tabular-nums",
                    overflowCount > 0
                      ? "border-amber-300/35 bg-amber-300/10 text-amber-200"
                      : "border-white/10 bg-white/5 text-zinc-300",
                  )}
                >
                  {selectedLoadoutIds.length}/{slotCapacity} ô
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedCharacter ? (
              <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-white/10 px-6 text-center">
                <div>
                  <Backpack className="mx-auto size-5 text-zinc-500" />
                  <p className="mt-3 text-sm font-medium text-zinc-300">
                    Chọn một người để chuẩn bị hành trang
                  </p>
                </div>
              </div>
            ) : visibleSlotCount === 0 ? (
              <div className="rounded-xl border border-amber-300/20 bg-amber-300/5 px-4 py-5 text-sm text-amber-100">
                Sức khỏe hiện tại không còn ô mang đồ.
              </div>
            ) : (
              <div className="space-y-2">
                {Array.from({ length: visibleSlotCount }, (_, index) => {
                  const itemId = selectedLoadoutIds[index];
                  const item = loadoutItems.find(
                    (loadoutItem) => loadoutItem.id === itemId,
                  );

                  return (
                    <ExpeditionLoadoutSlot
                      key={index}
                      index={index}
                      item={item}
                      isOverflow={index >= slotCapacity}
                      loadoutItems={loadoutItems}
                      selectedItemCounts={selectedItemCounts}
                      onSelect={(nextItemId) =>
                        onChangeLoadout(
                          setLoadoutSlot(
                            selectedLoadoutIds,
                            index,
                            nextItemId,
                          ),
                        )
                      }
                      onRemove={() =>
                        onChangeLoadout(
                          removeLoadoutSlot(selectedLoadoutIds, index),
                        )
                      }
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="sticky bottom-3 z-20 bg-zinc-900/95 shadow-xl backdrop-blur">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-medium text-zinc-200">
              {selectedCharacter
                ? `${selectedCharacter.name} · ${selectedLoadoutIds.length}/${slotCapacity} món`
                : "Chưa chọn người đi"}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Thời gian trở về chưa xác định. Đồ mang theo sẽ tạm rời kho.
            </p>
          </div>
          <Button
            size="lg"
            disabled={!canDepart}
            className="shrink-0 sm:min-w-40"
            onClick={onDepart}
          >
            <Backpack /> {departLabel}
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
