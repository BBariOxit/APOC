"use client";

import { Check, ChevronDown, Lock, Plus, X } from "lucide-react";
import { useId, useState } from "react";

import { ItemIcon } from "@/features/game/components/item-icon";
import type { InventoryItem } from "@/features/game/types";
import { cn } from "@/lib/utils";

interface ExpeditionLoadoutSlotProps {
  index: number;
  item?: InventoryItem;
  isLocked: boolean;
  loadoutItems: InventoryItem[];
  selectedItemCounts: Map<string, number>;
  onSelect: (itemId: string) => void;
  onRemove: () => void;
}

export function ExpeditionLoadoutSlot({
  index,
  item,
  isLocked,
  loadoutItems,
  selectedItemCounts,
  onSelect,
  onRemove,
}: ExpeditionLoadoutSlotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();

  if (isLocked && !item) {
    return (
      <div className="grid min-h-20 place-items-center rounded-xl border border-dashed border-white/8 bg-black/10 text-zinc-700">
        <Lock className="size-4" />
        <span className="sr-only">Ô hành trang bị khóa</span>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-label={
          item
            ? `Thay vật phẩm ${item.name} ở ô ${index + 1}`
            : `Chọn vật phẩm cho ô ${index + 1}`
        }
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          "flex min-h-20 w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
          item
            ? "border-white/10 bg-zinc-950/45 hover:bg-zinc-800/60"
            : "border-dashed border-white/12 bg-transparent text-muted-foreground hover:border-white/25 hover:bg-white/3 hover:text-zinc-200",
          isOpen && "border-zinc-500 bg-zinc-800/55",
          isLocked && "border-amber-300/45 bg-amber-300/5",
        )}
      >
        {item ? (
          <>
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/6 text-zinc-300">
              <ItemIcon icon={item.icon} className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-zinc-100">
                {item.name}
              </span>
              <span className="mt-0.5 block line-clamp-1 text-xs text-muted-foreground">
                {item.shortDescription}
              </span>
            </span>
          </>
        ) : (
          <>
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-dashed border-white/15">
              <Plus className="size-4" />
            </span>
            <span className="font-medium">Chọn vật phẩm</span>
          </>
        )}

        {isLocked ? (
          <Lock className="ml-auto size-4 shrink-0 text-amber-200/70" />
        ) : (
          <ChevronDown
            className={cn(
              "ml-auto size-4 shrink-0 text-zinc-500 transition-transform",
              isOpen && "rotate-180",
            )}
          />
        )}
      </button>

      {isOpen && (
        <div
          id={listId}
          className="mt-2 space-y-1 rounded-xl border border-white/10 bg-zinc-950/90 p-1.5 shadow-lg"
        >
          {!isLocked &&
            loadoutItems.map((loadoutItem) => {
              const selectedCount =
                selectedItemCounts.get(loadoutItem.id) ?? 0;
              const remainingCount = loadoutItem.quantity - selectedCount;
              const isCurrentItem = item?.id === loadoutItem.id;
              const isUnavailable = remainingCount <= 0 && !isCurrentItem;

              return (
                <button
                  key={loadoutItem.id}
                  type="button"
                  disabled={isUnavailable}
                  onClick={() => {
                    onSelect(loadoutItem.id);
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-zinc-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/6 text-zinc-300">
                    <ItemIcon icon={loadoutItem.icon} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {loadoutItem.name}
                    </span>
                    <span className="mt-0.5 block line-clamp-1 text-xs text-muted-foreground">
                      {loadoutItem.shortDescription}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {isCurrentItem ? (
                      <Check className="size-4 text-zinc-200" />
                    ) : (
                      `Còn ${Math.max(0, remainingCount)}`
                    )}
                  </span>
                </button>
              );
            })}

          {item && (
            <button
              type="button"
              onClick={() => {
                onRemove();
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg border-t border-white/8 px-2 py-2.5 text-left text-rose-300 transition-colors hover:bg-rose-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" /> Bỏ khỏi ô này
            </button>
          )}
        </div>
      )}
    </div>
  );
}
